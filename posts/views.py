from rest_framework import generics, permissions
from django.db.models import Count, Q
from django.contrib.auth.models import User
from .models import Observation, Comment, Survey, Client, ClientSite, SurveySession
from .serializers import (
    ObservationSerializer, CommentSerializer,
    SurveySerializer, SurveyDetailSerializer,
    ClientSerializer, ClientSiteSerializer,
    TeamMemberSerializer,
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

        return queryset

    def perform_create(self, serializer):
        survey = serializer.validated_data.get("survey")
        is_draft = serializer.validated_data.get("is_draft", False)

        if survey and survey.status != "live" and not is_draft:
            raise ValidationError(
                "Observations can only be added to a live survey."
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
        extra = {}
        if site:
            extra["access_notes"] = site.access_notes
            extra["site_contact_name"] = site.contact_name
            extra["site_contact_phone"] = site.contact_phone
            extra["site_contact_email"] = site.contact_email
        serializer.save(created_by=self.request.user, **extra)

class SurveyDetail(generics.RetrieveUpdateAPIView):
    queryset = Survey.objects.all()
    serializer_class = SurveyDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            from .serializers import SurveyWriteSerializer
            return SurveyWriteSerializer
        return SurveyDetailSerializer

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        new_status = serializer.validated_data.get("status", old_status)

        if old_status != new_status:
            survey = serializer.instance
            active_session = SurveySession.objects.filter(
                survey=survey,
                status__in=["active", "paused"],
            ).first()

            if new_status == "live":
                if active_session and active_session.status == "paused":
                    # Resume: reactivate the paused session
                    active_session.status = "active"
                    active_session.save(update_fields=["status"])
                elif not active_session:
                    # Start: create a new session
                    session_number = (
                        SurveySession.objects.filter(survey=survey).count() + 1
                    )
                    SurveySession.objects.create(
                        survey=survey,
                        session_number=session_number,
                        status="active",
                        started_by=self.request.user,
                    )

            elif new_status == "paused":
                if active_session and active_session.status == "active":
                    active_session.status = "paused"
                    active_session.save(update_fields=["status"])

            elif new_status == "submitted":
                if active_session:
                    active_session.status = "completed"
                    active_session.ended_at = timezone.now()
                    active_session.save(update_fields=["status", "ended_at"])

            elif new_status == "completed":
                if active_session:
                    raise ValidationError(
                        {"status": (
                            "Complete or abandon the current session "
                            "before marking the survey as complete."
                        )}
                    )

            elif new_status in ("cancelled", "missed"):
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

        if survey.status != "planned":
            return Response(
                {"detail": "Only planned surveys can be assigned."},
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
    queryset = User.objects.select_related("profile").order_by(
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


class DeleteDemoData(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        obs_count = Observation.objects.filter(
            is_demo=True
        ).count()
        survey_count = Survey.objects.filter(
            is_demo=True
        ).count()
        site_count = ClientSite.objects.filter(
            is_demo=True
        ).count()
        client_count = Client.objects.filter(
            is_demo=True
        ).count()

        # Delete in dependency order
        Observation.objects.filter(is_demo=True).delete()
        Survey.objects.filter(is_demo=True).delete()
        ClientSite.objects.filter(is_demo=True).delete()
        Client.objects.filter(is_demo=True).delete()

        return Response({
            "deleted": {
                "observations": obs_count,
                "surveys": survey_count,
                "sites": site_count,
                "clients": client_count,
            }
        })
