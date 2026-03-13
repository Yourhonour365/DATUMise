from rest_framework import generics, permissions
from django.db.models import Count
from django.contrib.auth.models import User
from .models import Observation, Comment, Survey, Client, ClientSite
from .serializers import (
    ObservationSerializer, CommentSerializer,
    SurveySerializer, SurveyDetailSerializer,
    ClientSerializer, ClientSiteSerializer,
    TeamMemberSerializer,
)
from .permissions import IsOwnerOrReadOnly
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
            comment_count=Count("comments")
        ).order_by("-created_at")

        survey_id = self.request.query_params.get("survey")
        if survey_id:
            queryset = queryset.filter(survey_id=survey_id)

        return queryset

    def perform_create(self, serializer):
        survey = serializer.validated_data.get("survey")

        if survey and survey.status != "live":
            raise ValidationError("Observations can only be added to a live survey.")

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
        IsOwnerOrReadOnly,
    ]

class SurveyList(generics.ListCreateAPIView):
    queryset = Survey.objects.annotate(
        observation_count=Count("observations")
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


class TeamList(generics.ListAPIView):
    queryset = User.objects.select_related("profile").order_by(
        "first_name", "last_name", "username"
    )
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated]


class TeamDetail(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related("profile")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            from .serializers import TeamMemberWriteSerializer
            return TeamMemberWriteSerializer
        return TeamMemberSerializer
