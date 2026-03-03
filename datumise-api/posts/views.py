from rest_framework import generics, permissions
from .models import Observation, Comment
from .serializers import ObservationSerializer, CommentSerializer
from .permissions import IsOwnerOrReadOnly


class ObservationList(generics.ListCreateAPIView):
    queryset = Observation.objects.all()
    serializer_class = ObservationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ObservationDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Observation.objects.all()
    serializer_class = ObservationSerializer
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsOwnerOrReadOnly,
    ]


class CommentList(generics.ListCreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)