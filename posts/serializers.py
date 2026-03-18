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

class TeamMemberCreateSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES, required=False
    )
    status = serializers.ChoiceField(
        choices=Profile.STATUS_CHOICES, required=False, default="active"
    )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            email=validated_data.get("email", ""),
            password=User.objects.make_random_password(),
        )
        profile = user.profile
        if "phone" in validated_data:
            profile.phone = validated_data["phone"]
        if "role" in validated_data:
            profile.role = validated_data["role"]
        if "status" in validated_data:
            profile.status = validated_data["status"]
        profile.save()
        return user


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
    reply_count = serializers.IntegerField(read_only=True)
    survey_name = serializers.SerializerMethodField()
    internal_note = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    comment_likes_count = serializers.SerializerMethodField()
    site_name = serializers.SerializerMethodField()
    survey_status = serializers.SerializerMethodField()

    def get_survey_name(self, obj):
        return str(obj.survey) if obj.survey else None

    def get_site_name(self, obj):
        if obj.survey and obj.survey.site:
            return obj.survey.site.name
        return ""

    def get_survey_status(self, obj):
        return obj.survey.status if obj.survey else None

    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = [
            "id",
            "owner",
            "survey",
            "survey_name",
            "site_name",
            "title",
            "description",
            "is_draft",
            "image",
            "created_at",
            "updated_at",
            "comment_count",
            "reply_count",
            "is_owner",
            "likes_count",
            "is_liked",
            "internal_note",
            "can_edit",
            "comment_likes_count",
            "survey_status",
        ]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return request and request.user == obj.owner

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if not request or request.user != obj.owner:
            return False
        if obj.survey and obj.survey.status != "live":
            return False
        return True

    def get_comment_likes_count(self, obj):
        total = 0
        for comment in obj.comments.all():
            total += comment.likes.count()
        return total

    def get_internal_note(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return ""
        if request.user == obj.owner or request.user.is_staff:
            return obj.description
        return ""

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
            "parent",
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
    total_likes_count = serializers.IntegerField(read_only=True)
    total_comments_count = serializers.IntegerField(read_only=True)
    name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    schedule_type_display = serializers.CharField(source="get_schedule_type_display", read_only=True)

    client = serializers.StringRelatedField()
    site = serializers.StringRelatedField()
    site_name = serializers.CharField(source="site.name", read_only=True, default="")
    site_address = serializers.SerializerMethodField()

    def get_site_address(self, obj):
        if not obj.site:
            return ""
        parts = [obj.site.address_line_1, obj.site.address_line_2, obj.site.city, obj.site.county, obj.site.postcode]
        return ", ".join(p for p in parts if p)

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
        return bool(request and request.user == obj.assigned_to)

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
            "site_name",
            "site_address",
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
            "total_likes_count",
            "total_comments_count",
            "is_owner",
            "is_surveyor",
        ]


class SurveyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Survey
        fields = [
            "id",
            "notes",
            "client",
            "site",
            "assigned_to",
            "status",
            "schedule_type",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
        ]

    def validate(self, attrs):
        instance = self.instance
        new_status = attrs.get("status", instance.status if instance else "planned")
        # For assigned_to, distinguish between "not in payload" and "set to null"
        if "assigned_to" in attrs:
            new_assigned = attrs["assigned_to"]
        else:
            new_assigned = instance.assigned_to if instance else None

        requires_assignment = {"live", "paused", "submitted", "missed"}
        if new_status in requires_assignment and new_assigned is None:
            raise serializers.ValidationError(
                {"status": f"Survey must be assigned before it can be {new_status}."}
            )

        if "assigned_to" in attrs and attrs["assigned_to"] is None:
            if new_status not in ("planned", "cancelled"):
                raise serializers.ValidationError(
                    {"assigned_to": "Cannot unassign a survey unless it is planned or cancelled."}
                )

        if "assigned_to" in attrs and attrs["assigned_to"] is not None:
            if attrs["assigned_to"].profile.role != "surveyor":
                raise serializers.ValidationError(
                    {"assigned_to": "Only surveyors can be assigned to surveys."}
                )

        # Resolve client and site from payload or existing instance
        if "client" in attrs:
            new_client = attrs["client"]
        else:
            new_client = instance.client if instance else None

        if "site" in attrs:
            new_site = attrs["site"]
        else:
            new_site = instance.site if instance else None

        if new_client is None:
            raise serializers.ValidationError(
                {"client": "A survey must have a client."}
            )

        if new_site is None:
            raise serializers.ValidationError(
                {"site": "A survey must have a site."}
            )

        if new_client.status != "active":
            raise serializers.ValidationError(
                {"client": "Surveys cannot be created for inactive clients."}
            )

        if new_site.status != "active":
            raise serializers.ValidationError(
                {"site": "Surveys cannot be created for inactive sites."}
            )

        if new_site.client_id != new_client.id:
            raise serializers.ValidationError(
                {"site": "The selected site does not belong to the selected client."}
            )

        new_schedule_type = attrs.get(
            "schedule_type", instance.schedule_type if instance else "pending"
        )
        if "scheduled_for" in attrs:
            new_scheduled_for = attrs["scheduled_for"]
        else:
            new_scheduled_for = instance.scheduled_for if instance else None

        if new_schedule_type in ("scheduled", "provisional") and not new_scheduled_for:
            raise serializers.ValidationError(
                {"scheduled_for": "A planned date is required when scheduling status is scheduled or provisional."}
            )

        return attrs


class SurveyDetailSerializer(serializers.ModelSerializer):
    observations = ObservationSerializer(many=True, read_only=True)
    name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    schedule_type_display = serializers.CharField(source="get_schedule_type_display", read_only=True)

    client = serializers.StringRelatedField()
    site = serializers.StringRelatedField()
    site_name = serializers.CharField(source="site.name", read_only=True, default="")

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
        return bool(request and request.user == obj.assigned_to)

    class Meta:
        model = Survey
        fields = [
            "id",
            "name",
            "notes",
            "client",
            "client_id",
            "site",
            "site_name",
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
            "address_line_1", "address_line_2", "city", "county",
            "postcode", "contact_name", "contact_phone", "contact_email",
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
