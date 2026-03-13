from django.contrib import admin
from .models import Survey, Observation, Comment, Client, ClientSite, ClientContact

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ("__str__", "client", "site", "status", "assigned_to", "notes", "is_incomplete")
    fields = (
        "notes",
        "client",
        "site",
        "created_by",
        "assigned_to",
        "status",
        "schedule_type",
        "scheduled_for",
        "due_by",
        "client_present",
        "urgent",
    )
    
@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "survey", "created_at")
    
admin.site.register(Comment)

admin.site.register(Client)
admin.site.register(ClientSite)
admin.site.register(ClientContact)