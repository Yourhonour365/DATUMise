from django.conf import settings
from django.db import models

# Create your models here.

class Survey(models.Model):
    STATUS_CHOICES = [
        ("created", "Created"),
        ("live", "Live"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("submitted", "Submitted"),
        ("missed", "Missed"),
        ("overdue", "Overdue"),
        ("cancelled", "Cancelled"),
    ]

    name = models.CharField(max_length=255)
    client = models.CharField(max_length=255, blank=True, null=True)
    site = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_surveys",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_surveys",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="created",
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    due_by = models.DateTimeField(null=True, blank=True)
    client_present = models.BooleanField(default=False)
    urgent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def is_incomplete(self):
        return not self.client or not self.site

    def __str__(self):
        return self.name




class Observation(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="observations",
    )

    survey = models.ForeignKey(
    Survey,
    on_delete=models.CASCADE,
    related_name="observations",
    null=True,
    blank=True,
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to="images/", blank=True, null=True)
    
    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
    
class Comment(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    observation = models.ForeignKey(
        Observation,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.owner} on {self.observation_id}"
    
    