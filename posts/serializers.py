from rest_framework import serializers
from .models import Observation


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