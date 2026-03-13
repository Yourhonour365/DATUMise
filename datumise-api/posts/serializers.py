from rest_framework import serializers
from .models import Observation, Comment, Survey, Client, ClientSite, Profile
from dj_rest_auth.registration.serializers import RegisterSerializer
from django.contrib.auth.models import User


class TeamMemberSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)
    role_display = serializers.CharField(source="profile.get_role_display", read_only=True)
    phone = serializers.CharField(source="profile.phone", read_only=True)
    status = serializers.CharField(source="profile.status", read_only=True)
    status_display = serializers.CharField(source="profile.get_status_display", read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "name", "email",
            "role", "role_display", "phone",
            "status", "status_display",
        ]

    def get_name(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full or obj.username


class TeamMemberWriteSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES, required=False
    )
    status = serializers.ChoiceField(
        choices=Profile.STATUS_CHOICES, required=False
    )

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()
        profile = instance.profile
        if "phone" in validated_data:
            profile.phone = validated_data["phone"]
        if "role" in validated_data:
            profile.role = validated_data["role"]
        if "status" in validated_data:
            profile.status = validated_data["status"]
        profile.save()
        return instance

class CustomRegisterSerializer(RegisterSerializer):
    def validate_email(self, email):
        
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "A user with that email already exists."
            )
        return email



class ObservationSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    is_owner = serializers.SerializerMethodField()
    comment_count = serializers.IntegerField(read_only=True)
    survey_name = serializers.SerializerMethodField()

    def get_survey_name(self, obj):
        return str(obj.survey) if obj.survey else None
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

    observation_count = serializers.IntegerField(read_only=True)
    name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    schedule_type_display = serializers.CharField(source="get_schedule_type_display", read_only=True)

    client = serializers.StringRelatedField()
    site = serializers.StringRelatedField()

    client_id = serializers.IntegerField(source="client.id", read_only=True)
    site_id = serializers.IntegerField(source="site.id", read_only=True)
    assigned_to = serializers.StringRelatedField()
    assigned_to_id = serializers.IntegerField(source="assigned_to.id", read_only=True)
    created_by = serializers.StringRelatedField()
    is_owner = serializers.SerializerMethodField()
    is_surveyor = serializers.SerializerMethodField()

    def get_name(self, obj):
        return str(obj)

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.created_by)

    def get_is_surveyor(self, obj):
        request = self.context.get("request")
        return bool(request and (request.user == obj.assigned_to or request.user == obj.created_by))

    class Meta:
        model = Survey
        fields = [
            "id",
            "name",
            "notes",
            "client",
            "client_id",
            "site",
            "site_id",
            "created_by",
            "assigned_to",
            "assigned_to_id",
            "status",
            "status_display",
            "schedule_type",
            "schedule_type_display",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
            "access_notes",
            "site_contact_name",
            "site_contact_phone",
            "site_contact_email",
            "created_at",
            "observation_count",
            "is_owner",
            "is_surveyor",
        ]


class SurveyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Survey
        fields = [
            "notes",
            "client",
            "site",
            "assigned_to",
            "schedule_type",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
        ]


class SurveyDetailSerializer(serializers.ModelSerializer):
    observations = ObservationSerializer(many=True, read_only=True)
    name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    schedule_type_display = serializers.CharField(source="get_schedule_type_display", read_only=True)

    client = serializers.StringRelatedField()
    site = serializers.StringRelatedField()

    client_id = serializers.IntegerField(source="client.id", read_only=True)
    site_id = serializers.IntegerField(source="site.id", read_only=True)
    assigned_to = serializers.StringRelatedField()
    assigned_to_id = serializers.IntegerField(source="assigned_to.id", read_only=True)
    created_by = serializers.StringRelatedField()
    is_owner = serializers.SerializerMethodField()
    is_surveyor = serializers.SerializerMethodField()

    def get_name(self, obj):
        return str(obj)

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.created_by)

    def get_is_surveyor(self, obj):
        request = self.context.get("request")
        return bool(request and (request.user == obj.assigned_to or request.user == obj.created_by))

    class Meta:
        model = Survey
        fields = [
            "id",
            "name",
            "notes",
            "client",
            "client_id",
            "site",
            "site_id",
            "created_by",
            "assigned_to",
            "assigned_to_id",
            "status",
            "status_display",
            "schedule_type",
            "schedule_type_display",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
            "access_notes",
            "site_contact_name",
            "site_contact_phone",
            "site_contact_email",
            "created_at",
            "observations",
            "is_owner",
            "is_surveyor",
        ]


class ClientSiteSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source="client.name")
    survey_count = serializers.IntegerField(read_only=True)
    site_type_display = serializers.CharField(source="get_site_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ClientSite
        fields = [
            "id", "client", "client_name", "name", "site_type", "site_type_display",
            "address", "postcode", "contact_name", "contact_phone", "contact_email",
            "access_notes", "status", "status_display", "survey_count", "created_at",
        ]


class ClientSerializer(serializers.ModelSerializer):
    site_count = serializers.IntegerField(read_only=True)
    survey_count = serializers.IntegerField(read_only=True)
    client_type_display = serializers.CharField(source="get_client_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "name", "client_type", "client_type_display",
            "account_manager", "contact_name", "contact_email", "contact_phone",
            "billing_address", "status", "status_display",
            "site_count", "survey_count", "created_at",
        ]
