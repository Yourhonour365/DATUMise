from rest_framework import generics, permissions
from django.db.models import Count
from .models import Observation, Comment, Survey
from .serializers import ObservationSerializer, CommentSerializer, SurveySerializer
from .permissions import IsOwnerOrReadOnly
from django.utils import timezone
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ObservationList(generics.ListCreateAPIView):
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description"]
    
    def get_queryset(self):
        queryset = Observation.objects.annotate(
            comment_count=Count("comments")
        ).order_by("-created_at")

        survey_id = self.request.query_params.get("survey")
        if survey_id:
            queryset = queryset.filter(survey_id=survey_id)

        return queryset

    def perform_create(self, serializer):
        active_survey = Survey.objects.filter(
            created_by=self.request.user,
            status="active"
        ).order_by("-created_at").first()

        if not active_survey:
            active_survey = Survey.objects.create(
                name=f"Survey - {timezone.now().strftime('%d %b %Y')}",
                created_by=self.request.user,
                status="active",
            )

        serializer.save(owner=self.request.user, survey=active_survey)

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
    queryset = Survey.objects.all().order_by("-created_at")
    serializer_class = SurveySerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status"]
    search_fields = ["name", "client", "site"]

class SurveyDetail(generics.RetrieveUpdateAPIView):
    queryset = Survey.objects.all()
    serializer_class = SurveySerializer
    permission_classes = [permissions.IsAuthenticated]  

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

