from rest_framework import serializers
from .models import Observation, Comment, Survey


class ObservationSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    is_owner = serializers.SerializerMethodField()
    comment_count = serializers.IntegerField(read_only=True)
    survey_name = serializers.ReadOnlyField(source="survey.name")
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Observation
        fields = [
            "id",
            "owner",
            "survey",
            "survey_name",
            "title",
            "description",
            "image",
            "created_at",
            "updated_at",
            "comment_count",
            "is_owner",
            "likes_count",
            "is_liked",
        ]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return request and request.user == obj.owner

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        return request and request.user.is_authenticated and obj.likes.filter(id=request.user.id).exists()

class CommentSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    is_owner = serializers.SerializerMethodField()
    is_observation_owner = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()


    class Meta:
        model = Comment
        fields = [
            "id",
            "observation",
            "owner",
            "content",
            "created_at",
            "is_owner",
            "is_observation_owner",
            "likes_count",
            "is_liked",
        ]

        read_only_fields = [
            "owner",
            "created_at",
            "is_owner",
            "is_observation_owner",
        ]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.owner)

    def get_is_observation_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.observation.owner)

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        return request and request.user.is_authenticated and obj.likes.filter(id=request.user.id).exists()
    
class SurveySerializer(serializers.ModelSerializer):
    observations = ObservationSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "name",
            "client",
            "site",
            "created_by",
            "assigned_to",
            "status",
            "status_display",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
            "created_at",
            "observations",
        ]