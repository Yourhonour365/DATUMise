from rest_framework import generics, permissions
from django.db.models import Count, Q
from django.contrib.auth.models import User
from .models import Observation, Comment, Survey, Client, ClientSite, SurveySession
from .serializers import (
    ObservationSerializer, CommentSerializer,
    SurveySerializer, SurveyDetailSerializer,
    ClientSerializer, ClientSiteSerializer,
    TeamMemberSerializer, _STATUS_TRANSLATION,
)
from .permissions import IsOwnerOrReadOnly, IsCommentOwnerOrObservationOwner
from django.utils import timezone
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .filters import SurveyFilter, ObservationFilter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from rest_framework.exceptions import ValidationError

# Statuses in which a survey is actively being worked on and observations
# may be created. Mirrors _ACTIVE_SURVEY_STATUSES in serializers.py.
_ACTIVE_SURVEY_STATUSES = {"assigned"}


class ObservationList(generics.ListCreateAPIView):
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["title", "description"]
    filterset_class = ObservationFilter

    def get_queryset(self):
        queryset = Observation.objects.annotate(
            comment_count=Count("comments"),
            reply_count=Count("comments", filter=Q(comments__parent__isnull=False))
        ).order_by("-created_at")

        survey_id = self.request.query_params.get("survey")
        if survey_id:
            queryset = queryset.filter(survey_id=survey_id)
        else:
            queryset = queryset.filter(is_draft=False)

        return queryset

    def perform_create(self, serializer):
        survey = serializer.validated_data.get("survey")
        is_draft = serializer.validated_data.get("is_draft", False)

        if survey and survey.status not in _ACTIVE_SURVEY_STATUSES and not is_draft:
            raise ValidationError(
                "Observations can only be added to an active survey."
            )

        serializer.save(owner=self.request.user)

        
class ObservationDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Observation.objects.all()
    serializer_class = ObservationSerializer
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
    ]


class CommentList(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Comment.objects.all().order_by("-created_at")
        observation_id = self.request.query_params.get("observation")

        if observation_id:
            queryset = queryset.filter(observation=observation_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class CommentDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsCommentOwnerOrObservationOwner,
    ]

class SurveyList(generics.ListCreateAPIView):
    queryset = Survey.objects.annotate(
        observation_count=Count("observations", distinct=True),
        total_likes_count=Count("observations__likes", distinct=True),
        total_comments_count=Count("observations__comments", distinct=True),
        real_observation_count=Count(
            "observations",
            filter=Q(observations__is_draft=False, observations__image__isnull=False) & ~Q(observations__image=""),
            distinct=True,
        ),
    ).order_by("-created_at")
    serializer_class = SurveySerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = SurveyFilter
    search_fields = ["notes", "client__name", "site__name"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            from .serializers import SurveyWriteSerializer
            return SurveyWriteSerializer
        return SurveySerializer

    def perform_create(self, serializer):
        site = serializer.validated_data.get("site")
        extra = {"status": "draft"}
        if site:
            extra["access_notes"] = site.access_notes
            extra["site_contact_name"] = site.contact_name
            extra["site_contact_phone"] = site.contact_phone
            extra["site_contact_email"] = site.contact_email
        serializer.save(created_by=self.request.user, **extra)

class SurveyDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Survey.objects.all()
    serializer_class = SurveyDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            from .serializers import SurveyWriteSerializer
            return SurveyWriteSerializer
        return SurveyDetailSerializer

    def destroy(self, request, *args, **kwargs):
        survey = self.get_object()

        if request.user.profile.role != "admin":
            return Response(
                {"detail": "Only admins can delete surveys."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if survey.sessions.exists() or survey.observations.exists():
            return Response(
                {
                    "detail": (
                        "Surveys with sessions or observations cannot be deleted. "
                        "Archive instead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        survey.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        # What the frontend requested (may be a legacy string like "live").
        requested_status = serializer.validated_data.get("status", old_status)
        # What we actually store in the DB after translation.
        stored_status = _STATUS_TRANSLATION.get(
            requested_status, requested_status
        )

        # Write the translated value back before save.
        if "status" in serializer.validated_data:
            serializer.validated_data["status"] = stored_status

        # Auto-populate closure_reason for legacy terminal status transitions.
        if (
            requested_status in ("missed", "cancelled")
            and not serializer.validated_data.get("closure_reason")
        ):
            serializer.validated_data["closure_reason"] = (
                "missed" if requested_status == "missed" else "cancelled"
            )

        # Session lifecycle — only when a status value was explicitly sent.
        if "status" in serializer.validated_data:
            survey = serializer.instance
            active_session = SurveySession.objects.filter(
                survey=survey,
                status__in=["active", "paused"],
            ).first()

            if requested_status == "live":
                if active_session and active_session.status == "paused":
                    # Resume: reactivate the paused session.
                    active_session.status = "active"
                    active_session.save(update_fields=["status"])
                elif not active_session:
                    # Start: create a new session.
                    session_number = (
                        SurveySession.objects.filter(survey=survey).count() + 1
                    )
                    SurveySession.objects.create(
                        survey=survey,
                        session_number=session_number,
                        status="active",
                        started_by=self.request.user,
                    )

            elif requested_status == "paused":
                if active_session and active_session.status == "active":
                    active_session.status = "paused"
                    active_session.save(update_fields=["status"])

            elif requested_status == "submitted":
                if active_session:
                    active_session.status = "completed"
                    active_session.ended_at = timezone.now()
                    active_session.save(update_fields=["status", "ended_at"])

            elif requested_status == "completed":
                if active_session:
                    raise ValidationError(
                        {"status": (
                            "Complete or abandon the current session "
                            "before marking the survey as complete."
                        )}
                    )

            elif requested_status in ("cancelled", "missed", "archived"):
                if active_session:
                    active_session.status = "abandoned"
                    active_session.ended_at = timezone.now()
                    active_session.save(update_fields=["status", "ended_at"])

        serializer.save()

class SurveyAssign(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            survey = Survey.objects.get(pk=pk)
        except Survey.DoesNotExist:
            return Response(
                {"detail": "Survey not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if survey.assigned_to is not None:
            return Response(
                {"detail": "Survey is already assigned."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if survey.status != "open":
            return Response(
                {"detail": "Only open surveys can be assigned."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.profile.role != "surveyor":
            return Response(
                {"detail": "Only surveyors can be assigned to surveys."},
                status=status.HTTP_403_FORBIDDEN,
            )

        survey.assigned_to = request.user
        survey.save()

        serializer = SurveyDetailSerializer(survey, context={"request": request})
        return Response(serializer.data)


class ObservationLikeToggle(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            observation = Observation.objects.get(pk=pk)
        except Observation.DoesNotExist:
            return Response(
                {"detail": "Observation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
       
        if observation.owner == request.user:
            return Response(
                {"detail": "You cannot like your own observation."},
                status=status.HTTP_403_FORBIDDEN,
            )



        if observation.likes.filter(id=request.user.id).exists():
            observation.likes.remove(request.user)
            return Response({"liked": False, "likes_count": observation.likes.count()})

        observation.likes.add(request.user)
        return Response({"liked": True, "likes_count": observation.likes.count()})

class CommentLikeToggle(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            comment = Comment.objects.get(pk=pk)
        except Comment.DoesNotExist:
            return Response(
                {"detail": "Comment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if comment.owner == request.user:
            return Response(
                {"detail": "You cannot like your own comment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if comment.likes.filter(id=request.user.id).exists():
            comment.likes.remove(request.user)
            return Response({"liked": False, "likes_count": comment.likes.count()})

        comment.likes.add(request.user)
        return Response({"liked": True, "likes_count": comment.likes.count()})


class ClientDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Client.objects.annotate(
        site_count=Count("sites"),
        survey_count=Count("surveys"),
    )
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]


class ClientList(generics.ListCreateAPIView):
    queryset = Client.objects.annotate(
        site_count=Count("sites"),
        survey_count=Count("surveys"),
    ).order_by("name")
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]


class ClientSiteList(generics.ListCreateAPIView):
    serializer_class = ClientSiteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ClientSite.objects.annotate(
            survey_count=Count("surveys"),
        ).order_by("name")
        client_id = self.request.query_params.get("client")
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset


class ClientSiteDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = ClientSite.objects.annotate(
        survey_count=Count("surveys"),
    )
    serializer_class = ClientSiteSerializer
    permission_classes = [permissions.IsAuthenticated]


class TeamList(generics.ListCreateAPIView):
    queryset = User.objects.select_related("profile").annotate(
        survey_count=Count("assigned_surveys"),
    ).order_by(
        "first_name", "last_name", "username"
    )
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            from .serializers import TeamMemberCreateSerializer
            return TeamMemberCreateSerializer
        return TeamMemberSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        read_serializer = TeamMemberSerializer(user, context={"request": request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class TeamDetail(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related("profile")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            from .serializers import TeamMemberWriteSerializer
            return TeamMemberWriteSerializer
        return TeamMemberSerializer
