from app.database import programs_db as db


class Program(db.Model):
    __tablename__ = "programs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(80), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)

    track_slots = db.relationship(
        "TrackSlot",
        back_populates="program",
        cascade="all, delete-orphan",
        order_by="TrackSlot.number",
    )

    releases = db.relationship(
        "Release",
        back_populates="program",
        cascade="all, delete-orphan",
        order_by="Release.sort_order",
    )


class TrackSlot(db.Model):
    __tablename__ = "track_slots"

    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey("programs.id"), nullable=False)
    number = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(120), nullable=False)

    program = db.relationship("Program", back_populates="track_slots")

    tracks = db.relationship(
        "Track",
        back_populates="slot",
        cascade="all, delete-orphan",
    )


class Release(db.Model):
    __tablename__ = "releases"

    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey("programs.id"), nullable=False)

    code = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    display_number = db.Column(db.String(40), nullable=False)
    sort_order = db.Column(db.Float, nullable=False)

    year = db.Column(db.Integer, nullable=True)
    quarter = db.Column(db.String(2), nullable=True)

    program = db.relationship("Program", back_populates="releases")

    tracks = db.relationship(
        "Track",
        back_populates="release",
        cascade="all, delete-orphan",
    )


class Track(db.Model):
    __tablename__ = "tracks"

    id = db.Column(db.Integer, primary_key=True)

    program_id = db.Column(db.Integer, db.ForeignKey("programs.id"), nullable=False)
    release_id = db.Column(db.Integer, db.ForeignKey("releases.id"), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey("track_slots.id"), nullable=False)

    source_code = db.Column(db.String(50), nullable=True)
    group_key = db.Column(db.String(50), nullable=True)
    segment = db.Column(db.String(10), nullable=True)
    variant_type = db.Column(db.String(20), nullable=False, default="main")
    source_track_number = db.Column(db.String(20), nullable=True)

    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    duration = db.Column(db.String(20), nullable=True)
    genre = db.Column(db.String(80), nullable=True)
    difficulty = db.Column(db.String(40), nullable=True)

    release = db.relationship("Release", back_populates="tracks")
    slot = db.relationship("TrackSlot", back_populates="tracks")

    tags = db.relationship(
        "TrackTag",
        back_populates="track",
        cascade="all, delete-orphan",
    )


class TrackTag(db.Model):
    __tablename__ = "track_tags"

    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer, db.ForeignKey("tracks.id"), nullable=False)
    tag = db.Column(db.String(80), nullable=False)

    track = db.relationship("Track", back_populates="tags")