from django.contrib import admin
from django.contrib import admin
from .models import Survey, Observation, Comment

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "site", "status", "assigned_to", "is_incomplete")
    
admin.site.register(Observation)
admin.site.register(Comment)

