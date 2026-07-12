from datetime import datetime, timezone

from app.database import programs_db as db


class TrackChangeSuggestion(db.Model):
    __bind_key__ = "users"
    __tablename__ = "track_change_suggestions"

    id = db.Column(db.Integer, primary_key=True)

    track_id = db.Column(db.Integer, nullable=False)
    program_slug = db.Column(db.String(80), nullable=False)
    release_code = db.Column(db.String(40), nullable=False)

    suggested_title = db.Column(db.String(200), nullable=True)
    suggested_artist = db.Column(db.String(200), nullable=True)
    suggested_duration = db.Column(db.String(20), nullable=True)
    suggested_genre = db.Column(db.String(80), nullable=True)
    suggested_difficulty = db.Column(db.String(40), nullable=True)
    suggested_tags = db.Column(db.Text, nullable=True)

    notes = db.Column(db.Text, nullable=True)

    status = db.Column(db.String(30), nullable=False, default="pending")

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    reviewed_at = db.Column(db.DateTime, nullable=True)
    review_notes = db.Column(db.Text, nullable=True)