from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0021_comment_parent'),
    ]

    operations = [
        migrations.AddField(
            model_name='observation',
            name='is_draft',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='observation',
            name='title',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]
