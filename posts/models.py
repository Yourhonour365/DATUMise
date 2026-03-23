from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("office", "Office"),
        ("surveyor", "Surveyor"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="surveyor")
    phone = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_or_update_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    else:
        instance.profile.save()


class Client(models.Model):
    CLIENT_TYPE_CHOICES = [
        ("commercial", "Commercial"),
        ("local_authority", "Local authority"),
        ("education", "Education"),
        ("retail", "Retail"),
        ("residential", "Residential portfolio"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    name = models.CharField(max_length=255)
    client_type = models.CharField(max_length=30, choices=CLIENT_TYPE_CHOICES, blank=True)
    account_manager = models.CharField(max_length=255, blank=True)
    contact_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    billing_address = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class ClientSite(models.Model):
    SITE_TYPE_CHOICES = [
        ("car_park", "Car park"),
        ("retail_park", "Retail park"),
        ("industrial_estate", "Industrial estate"),
        ("school", "School"),
        ("office_campus", "Office campus"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="sites",
    )
    name = models.CharField(max_length=255)
    site_type = models.CharField(max_length=30, choices=SITE_TYPE_CHOICES, blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    county = models.CharField(max_length=100, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    contact_name = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    contact_email = models.EmailField(blank=True)
    access_notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.client.name}, {self.name}"

class ClientContact(models.Model):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()

class Survey(models.Model):
    STATUS_CHOICES = [
        ("planned", "Planned"),
        ("live", "Live"),
        ("paused", "Paused"),
        ("submitted", "Submitted"),
        ("completed", "Completed"),
        ("missed", "Missed"),
        ("cancelled", "Cancelled"),
    ]

    SCHEDULE_TYPE_CHOICES = [
        ("scheduled", "Scheduled"),
        ("provisional", "Provisional"),
        ("self_scheduling", "Self-scheduling"),
        ("pending", "Pending"),
    ]

    notes = models.CharField(max_length=160, blank=True, default="")
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="surveys",
        null=True,
        blank=True,
    )

    site = models.ForeignKey(
        ClientSite,
        on_delete=models.CASCADE,
        related_name="surveys",
        null=True,
        blank=True,
    )
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
        default="planned",
    )
    schedule_type = models.CharField(
        max_length=20,
        choices=SCHEDULE_TYPE_CHOICES,
        default="pending",
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    due_by = models.DateTimeField(null=True, blank=True)
    client_present = models.BooleanField(default=False)
    urgent = models.BooleanField(default=False)
    access_notes = models.TextField(blank=True)
    site_contact_name = models.CharField(max_length=255, blank=True)
    site_contact_phone = models.CharField(max_length=50, blank=True)
    site_contact_email = models.EmailField(blank=True)
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.schedule_type in ("scheduled", "provisional") and not self.scheduled_for:
            raise ValidationError(
                {"scheduled_for": "A planned date is required when schedule type is scheduled or provisional."}
            )

    class Meta:
        ordering = ["-created_at"]

    def is_incomplete(self):
        return self.client is None or self.site is None

    def __str__(self):
        parts = []
        if self.client:
            parts.append(str(self.client))
        if self.site:
            parts.append(self.site.name)
        if not parts:
            parts.append(f"Survey #{self.pk}")
        return " \u2013 ".join(parts)




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

    title = models.CharField(max_length=500, blank=True, default="")
    description = models.TextField(blank=True)
    is_draft = models.BooleanField(default=False)
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to="images/", blank=True, null=True)
    

    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_observations",
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or f"Draft observation {self.pk}"

class SurveySession(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("abandoned", "Abandoned"),
    ]

    survey = models.ForeignKey(
        Survey,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    session_number = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="survey_sessions",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["session_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["survey"],
                condition=models.Q(status__in=["active", "paused"]),
                name="unique_active_session_per_survey",
            )
        ]

    def __str__(self):
        return f"Session {self.session_number} – {self.survey}"


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
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="replies",
        null=True,
        blank=True,
    )
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="liked_comments",
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.owner} on {self.observation_id}"
    
    