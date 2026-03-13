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

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "client_type", "status", "is_demo")
    list_filter = ("status", "is_demo")
    fields = (
        "name", "client_type", "account_manager",
        "contact_name", "contact_email", "contact_phone",
        "billing_address", "status", "is_demo",
    )
    actions = ["delete_demo_data"]

    @admin.action(description="Delete demo clients and all related data")
    def delete_demo_data(self, request, queryset):
        demo_clients = Client.objects.filter(is_demo=True)
        count = demo_clients.count()
        demo_clients.delete()
        self.message_user(request, f"Deleted {count} demo client(s) and all related data.")
admin.site.register(ClientSite)
admin.site.register(ClientContact)