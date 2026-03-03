from rest_framework import serializers
from .models import Observation, Comment


class ObservationSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Observation
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "created_at",
            "updated_at",
        ]

class CommentSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Comment
        fields = [
            "id",
            "observation",
            "owner",
            "content",
            "created_at",
            
        ]
        read_only_fields = [
            "owner",
            "created_at",
            
        ]