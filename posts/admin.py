from django.contrib import admin
from django.contrib import admin
from .models import Survey, Observation, Comment

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "site", "status", "assigned_to", "is_incomplete")

@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "survey", "created_at")
    
admin.site.register(Comment)

