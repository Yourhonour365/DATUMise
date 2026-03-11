from django.contrib import admin
from .models import Survey, Observation, Comment, Client, ClientSite, ClientContact

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "site", "status", "assigned_to", "is_incomplete")
    fields = (
        "name",
        "client",
        "site",
        "created_by",
        "assigned_to",
        "status",
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