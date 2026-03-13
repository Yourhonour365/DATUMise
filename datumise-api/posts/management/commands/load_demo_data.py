import shutil
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from posts.models import (
    Client,
    ClientContact,
    ClientSite,
    Comment,
    Observation,
    Survey,
)

DEMO_IMAGES_DIR = Path(__file__).resolve().parent.parent / "demo_images"


CLIENTS = [
    {
        "name": "Checkout Capital Ltd",
        "client_type": "commercial",
        "account_manager": "Barry Brickcheck",
        "contact_name": "Trevor Trafficcone",
        "contact_email": "traffic@cone.uk",
        "billing_address": "Big Buy Park, Unit 6, Retail Drive, Bath, BA2 3HQ",
    },
    {
        "name": "Prime Parking Assets Ltd",
        "client_type": "commercial",
        "account_manager": "Carl Crackfinder",
        "contact_name": "Pete Pothole",
        "contact_email": "pothole@pete.co.uk",
        "billing_address": "Budget Boulevard Retail Park, Unit 2, Oxford Road, High Wycombe, HP11 2DN",
    },
    {
        "name": "Value Village Holdings Ltd",
        "client_type": "retail",
        "account_manager": "Eddie Eagleeye",
        "contact_name": "Larry Loadingbay",
        "contact_email": "loading@larry.co.uk",
        "billing_address": "Outlet Junction, Unit 9, Park Road, Maidenhead, SL6 1QL",
    },
]

SITES = [
    {
        "client": "Checkout Capital Ltd",
        "name": "Cart & Carry Plaza",
        "site_type": "retail_park",
        "address": "Checkout Centre, Unit 4, Retail Way, Manchester",
        "postcode": "M1 3AJ",
        "contact_name": "Neil Nightshift",
        "access_notes": "After 2pm weekdays",
    },
    {
        "client": "Checkout Capital Ltd",
        "name": "Checkout Corner",
        "site_type": "retail_park",
        "address": "Checkout Corner, Unit 6, Retail Road, Harlow,",
        "postcode": "CM20 2DP",
        "contact_name": "Barry Bollard",
        "access_notes": "Anytime after 10am",
    },
    {
        "client": "Prime Parking Assets Ltd",
        "name": "Price Drop Park",
        "site_type": "car_park",
        "address": "Price Drop Park, Unit 4, Enterprise Way, Milton Keynes,",
        "postcode": "MK9 2NW",
        "contact_name": "Stan Securitygate",
        "access_notes": "Report to reception",
    },
    {
        "client": "Prime Parking Assets Ltd",
        "name": "SpendSmart Retail Park",
        "site_type": "retail_park",
        "address": "SpendSmart Retail Park, Unit 12, Station Approach, Redhill,",
        "postcode": "RH1 1QF",
        "contact_name": "Andy Accessgate",
    },
    {
        "client": "Value Village Holdings Ltd",
        "name": "Value Village Retail Park",
        "site_type": "retail_park",
        "address": "Value Village Retail Park, Unit 3, Market Road, Salisbury,",
        "postcode": "SP1 2DF",
        "contact_name": "Mark Missalot",
    },
]

CONTACTS = [
    {"client": "Checkout Capital Ltd", "first_name": "Dave", "last_name": "Drainage"},
    {"client": "Prime Parking Assets Ltd", "first_name": "Simon", "last_name": "SurfaceScan"},
    {"client": "Value Village Holdings Ltd", "first_name": "Frank", "last_name": "Forklift"},
]

# Surveys reference users by username.
# created_by and assigned_to must exist before loading.
SURVEYS = [
    {
        "client": "Value Village Holdings Ltd",
        "site": "Value Village Retail Park",
        "status": "submitted",
        "schedule_type": "self_scheduling",
        "created_by": "SamSurveyor",
        "assigned_to": "SamSurveyor",
    },
    {
        "client": "Prime Parking Assets Ltd",
        "site": "SpendSmart Retail Park",
        "status": "planned",
        "schedule_type": "pending",
        "created_by": "SamSurveyor",
        "assigned_to": "SamSurveyor",
    },
    {
        "client": "Prime Parking Assets Ltd",
        "site": "Price Drop Park",
        "notes": "Drainage follow up",
        "status": "planned",
        "schedule_type": "pending",
        "created_by": "SamSurveyor",
        "assigned_to": "SallySurvery",
    },
    {
        "client": "Checkout Capital Ltd",
        "site": "Checkout Corner",
        "status": "planned",
        "schedule_type": "scheduled",
        "created_by": "SamSurveyor",
        "assigned_to": "SallySurvery",
        "client_present": True,
    },
    {
        "client": "Checkout Capital Ltd",
        "site": "Cart & Carry Plaza",
        "status": "planned",
        "schedule_type": "pending",
        "created_by": "SamSurveyor",
        "assigned_to": "SallySurvery",
        "client_present": True,
        "urgent": True,
    },
]

OBSERVATIONS = [
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Flexible Bollard Leaning After Impact. Base Distortion Suggests Repeated Vehicle Contact.",
        "image": "A_springy_bollard_-_geograph_u6FuwLT.org.uk_-_7000841.jpg",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Block Paving Displaced And Heaved. Likely Caused By Sub-base Failure Or Ground Movement.",
        "image": "Burst_Paving_Stones_-_Whitehaven_Market_-_June_2007_-_geograph.org.uk_-_556597.jpg",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Severely Corroded Bolt With Significant Rust And Material Loss. Potential Structural Fastening Failure Risk.",
        "image": "Corroded_Bolt.jpg",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Pothole Exposing Underlying Aggregate. Edge Deterioration And Water Ingress Accelerating Pavement Failure.",
        "image": "IMG_1197.JPEG",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Vertical Cracking And Mortar Loss In Brick Planter Wall. Vegetation Growth Indicates Prolonged Moisture Ingress.",
        "image": "IMG_1502.JPEG",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Paving Slab Settlement Creating Uneven Surface And Trip Hazard.",
        "image": "IMG_1521.JPEG",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Raised Ridge In Asphalt Surface, Possibly From Thermal Movement Or Failed Reinstatement.",
        "image": "IMG_1571.JPEG",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Crash Barrier Bent From Vehicle Impact. Structural Protection Function Likely Compromised.",
        "image": "IMG_1915_Ai7KokK.JPEG",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Brick pier damaged by vehicle impact. Displaced bricks and mortar loss compromising structural stability.",
        "image": "IMG_1418.JPEG",
    },
    {
        "survey_site": "Value Village Retail Park",
        "owner": "SamSurveyor",
        "title": "Severe asphalt fatigue cracking with water ingress. Surface breaking apart and likely to develop potholes.",
        "image": "IMG_1647.JPEG",
    },
]

COMMENTS = [
    {
        "observation_title": "Crash Barrier Bent From Vehicle Impact",
        "owner": "OliviaOffice",
        "content": "Wow!",
    },
    {
        "observation_title": "Flexible Bollard Leaning After Impact",
        "owner": "OliviaOffice",
        "content": "yikes!",
    },
    {
        "observation_title": "Paving Slab Settlement Creating Uneven Surface",
        "owner": "SamSurveyor",
        "content": "Wow! need root guards or the whole walkway will come up",
    },
    {
        "observation_title": "Flexible Bollard Leaning After Impact",
        "owner": "SamSurveyor",
        "content": "needs replacement",
    },
]


class Command(BaseCommand):
    help = "Load demo clients, sites, surveys, observations and comments"

    def handle(self, *args, **options):
        if Client.objects.filter(is_demo=True).exists():
            self.stderr.write(
                self.style.WARNING(
                    "Demo data already exists. Delete it first via Django admin before reloading."
                )
            )
            return

        # Ensure media/images directory exists
        images_dest = Path(settings.MEDIA_ROOT) / "images"
        images_dest.mkdir(parents=True, exist_ok=True)

        # --- Clients ---
        client_map = {}
        for data in CLIENTS:
            client = Client.objects.create(is_demo=True, **data)
            client_map[client.name] = client
        self.stdout.write(f"  Created {len(client_map)} clients")

        # --- Sites ---
        site_map = {}
        for data in SITES:
            client = client_map[data.pop("client")]
            site = ClientSite.objects.create(client=client, **data)
            site_map[site.name] = site
        self.stdout.write(f"  Created {len(site_map)} sites")

        # --- Contacts ---
        for data in CONTACTS:
            client = client_map[data.pop("client")]
            ClientContact.objects.create(client=client, **data)
        self.stdout.write(f"  Created {len(CONTACTS)} contacts")

        # --- Users lookup ---
        def get_user(username):
            try:
                return User.objects.get(username=username)
            except User.DoesNotExist:
                self.stderr.write(
                    self.style.ERROR(f"User '{username}' not found. Create demo users first.")
                )
                raise

        # --- Surveys ---
        survey_map = {}
        for data in SURVEYS:
            client = client_map[data.pop("client")]
            site = site_map[data.pop("site")]
            created_by = get_user(data.pop("created_by"))
            assigned_to_username = data.pop("assigned_to", None)
            assigned_to = get_user(assigned_to_username) if assigned_to_username else None
            survey = Survey.objects.create(
                client=client,
                site=site,
                created_by=created_by,
                assigned_to=assigned_to,
                **data,
            )
            survey_map[site.name] = survey
        self.stdout.write(f"  Created {len(survey_map)} surveys")

        # --- Observations (with images) ---
        obs_list = []
        for data in OBSERVATIONS:
            survey = survey_map[data["survey_site"]]
            owner = get_user(data["owner"])
            image_name = data.get("image", "")

            # Copy demo image to media folder
            if image_name:
                src = DEMO_IMAGES_DIR / image_name
                dst = images_dest / image_name
                if src.exists():
                    shutil.copy2(src, dst)
                else:
                    self.stderr.write(self.style.WARNING(f"  Image not found: {src}"))
                    image_name = ""

            obs = Observation.objects.create(
                survey=survey,
                owner=owner,
                title=data["title"],
                image=f"images/{image_name}" if image_name else "",
            )
            obs_list.append(obs)
        self.stdout.write(f"  Created {len(obs_list)} observations")

        # --- Comments ---
        for data in COMMENTS:
            owner = get_user(data["owner"])
            # Match observation by title prefix
            obs = next(
                (o for o in obs_list if o.title.startswith(data["observation_title"])),
                None,
            )
            if obs:
                Comment.objects.create(
                    observation=obs,
                    owner=owner,
                    content=data["content"],
                )
        self.stdout.write(f"  Created {len(COMMENTS)} comments")

        self.stdout.write(self.style.SUCCESS("Demo data loaded successfully."))
