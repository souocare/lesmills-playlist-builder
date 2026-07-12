import os
from functools import wraps

from flask import (
    Blueprint,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
import re
from app.database import programs_db as db
from app.models import Program, Release, Track, TrackSlot, TrackTag


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def admin_required(route_function):
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if not session.get("is_admin"):
            return redirect(url_for("admin.login"))

        return route_function(*args, **kwargs)

    return wrapper

def parse_tags(tags_raw: str) -> list[str]:
    return [
        tag.strip()
        for tag in tags_raw.split(",")
        if tag.strip()
    ]


def get_track_slot_or_none(program_id: int, slot_number: int) -> TrackSlot | None:
    return (
        TrackSlot.query
        .filter_by(
            program_id=program_id,
            number=slot_number,
        )
        .first()
    )


def get_segment_from_source_track_number(source_track_number: str) -> str | None:
    match = re.match(r"^\d+([A-Za-z])$", source_track_number.strip())

    if not match:
        return None

    return match.group(1).upper()


def build_default_group_key(
    program: Program,
    release: Release,
    variant_type: str,
    source_track_number: str,
    source_code: str | None,
) -> str:
    clean_track_number = source_track_number.strip().upper()

    if source_code:
        clean_source_code = source_code.strip().upper()

        if variant_type == "main":
            return re.sub(r"[A-Z]$", "", clean_source_code)

        return clean_source_code.replace("BT", "BON")

    program_prefix = program.slug.upper().replace("-", "_")
    release_code = release.code.upper()

    if variant_type == "main":
        base_track_number = re.sub(r"[A-Z]$", "", clean_track_number)
        return f"{program_prefix}{release_code}{base_track_number.zfill(2)}"

    if variant_type == "bonus":
        return f"{program_prefix}{release_code}{clean_track_number.replace('BT', 'BON')}"

    if variant_type == "alternative":
        return f"{program_prefix}{release_code}{clean_track_number}"

    return f"{program_prefix}{release_code}{clean_track_number}"


def normalise_source_track_number(
    variant_type: str,
    source_track_number: str,
    slot_number: int,
) -> str:
    clean_value = source_track_number.strip().upper()

    if clean_value:
        if variant_type == "bonus":
            return clean_value.replace("BT", "BON")

        return clean_value

    if variant_type == "bonus":
        return f"BON{slot_number:02d}"

    if variant_type == "alternative":
        return f"ALT{slot_number:02d}"

    return str(slot_number)

def parse_bulk_track_line(line: str) -> dict | None:
    parts = [part.strip() for part in line.split("|")]

    if len(parts) < 3:
        return None

    while len(parts) < 7:
        parts.append("")

    return {
        "track_number": parts[0],
        "title": parts[1],
        "artist": parts[2],
        "duration": parts[3] or None,
        "genre": parts[4] or None,
        "difficulty": parts[5] or None,
        "tags": parse_tags(parts[6]),
    }


def parse_source_track_number(value: str) -> dict:
    clean_value = value.strip().upper()

    bonus_match = re.match(r"^(BON|BT)(\d{1,2})$", clean_value)
    if bonus_match:
        slot_number = int(bonus_match.group(2))

        return {
            "slot_number": slot_number,
            "source_track_number": f"BON{slot_number:02d}",
            "segment": None,
            "variant_type": "bonus",
            "group_suffix": f"BON{slot_number:02d}",
        }

    alternative_match = re.match(r"^ALT(\d{1,2})$", clean_value)
    if alternative_match:
        slot_number = int(alternative_match.group(1))

        return {
            "slot_number": slot_number,
            "source_track_number": f"ALT{slot_number:02d}",
            "segment": None,
            "variant_type": "alternative",
            "group_suffix": f"ALT{slot_number:02d}",
        }

    main_match = re.match(r"^(\d{1,2})([A-Z]?)$", clean_value)
    if main_match:
        slot_number = int(main_match.group(1))
        segment = main_match.group(2) or None

        return {
            "slot_number": slot_number,
            "source_track_number": f"{slot_number}{segment or ''}",
            "segment": segment,
            "variant_type": "main",
            "group_suffix": f"{slot_number:02d}",
        }

    raise ValueError(f"Invalid track number: {value}")


def build_release_track_group_key(program: Program, release: Release, parsed_track_number: dict) -> str:
    program_prefix = program.slug.upper().replace("-", "_")
    release_code = release.code.upper()

    return f"{program_prefix}{release_code}{parsed_track_number['group_suffix']}"


def build_release_track_source_code(program: Program, release: Release, parsed_track_number: dict) -> str:
    if program.slug == "bodycombat":
        prefix = "BC"
    elif program.slug == "bodypump":
        prefix = "BP"
    else:
        prefix = program.slug.upper().replace("-", "")

    return f"{prefix}{release.code.upper()}{parsed_track_number['source_track_number']}"


@admin_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        password = request.form.get("password", "")
        expected_password = os.environ.get("ADMIN_PASSWORD")

        if not expected_password:
            flash("ADMIN_PASSWORD is not configured.", "error")
            return redirect(url_for("admin.login"))

        if password == expected_password:
            session["is_admin"] = True
            return redirect(url_for("admin.tracks"))

        flash("Invalid password.", "error")

    return render_template("admin/login.html")


@admin_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("is_admin", None)
    return redirect(url_for("admin.login"))




@admin_bp.route("/")
@admin_required
def dashboard():
    return redirect(url_for("admin.tracks"))


@admin_bp.route("/tracks", methods=["GET", "POST"])
@admin_required
def tracks():

    if request.method == "POST":
        form_action = request.form.get("form_action", "update_track")

        if form_action == "create_release":
            program_id = request.form.get("program_id", type=int)

            program = Program.query.get_or_404(program_id)

            code = request.form.get("code", "").strip().lower()
            title = request.form.get("title", "").strip()
            display_number = request.form.get("display_number", "").strip()
            sort_order = request.form.get("sort_order", type=float)
            year = request.form.get("year", type=int)
            quarter = request.form.get("quarter", "").strip() or None
            bulk_tracks = request.form.get("bulk_tracks", "")

            if not code or not title or not display_number or sort_order is None:
                flash("Release code, title, display number, and sort order are required.", "error")
                return redirect(request.referrer or url_for("admin.tracks"))

            existing_release = Release.query.filter_by(
                program_id=program.id,
                code=code,
            ).first()

            if existing_release:
                flash("That release already exists for this program.", "error")
                return redirect(request.referrer or url_for("admin.tracks"))

            release = Release(
                program_id=program.id,
                code=code,
                title=title,
                display_number=display_number,
                sort_order=sort_order,
                year=year,
                quarter=quarter,
            )

            db.session.add(release)
            db.session.flush()

            created_tracks_count = 0

            for line_number, line in enumerate(bulk_tracks.splitlines(), start=1):
                clean_line = line.strip()

                if not clean_line:
                    continue

                parsed_line = parse_bulk_track_line(clean_line)

                if parsed_line is None:
                    flash(f"Invalid track line {line_number}: {line}", "error")
                    db.session.rollback()
                    return redirect(request.referrer or url_for("admin.tracks"))

                try:
                    parsed_track_number = parse_source_track_number(parsed_line["track_number"])
                except ValueError as error:
                    flash(f"Line {line_number}: {error}", "error")
                    db.session.rollback()
                    return redirect(request.referrer or url_for("admin.tracks"))

                slot = get_track_slot_or_none(
                    program_id=program.id,
                    slot_number=parsed_track_number["slot_number"],
                )

                if slot is None:
                    flash(
                        f"Line {line_number}: invalid slot {parsed_track_number['slot_number']} for {program.name}.",
                        "error",
                    )
                    db.session.rollback()
                    return redirect(request.referrer or url_for("admin.tracks"))

                track = Track(
                    program_id=program.id,
                    release_id=release.id,
                    slot_id=slot.id,
                    source_code=build_release_track_source_code(program, release, parsed_track_number),
                    group_key=build_release_track_group_key(program, release, parsed_track_number),
                    segment=parsed_track_number["segment"],
                    variant_type=parsed_track_number["variant_type"],
                    source_track_number=parsed_track_number["source_track_number"],
                    title=parsed_line["title"],
                    artist=parsed_line["artist"],
                    duration=parsed_line["duration"],
                    genre=parsed_line["genre"],
                    difficulty=parsed_line["difficulty"],
                )

                db.session.add(track)
                db.session.flush()

                for tag in parsed_line["tags"]:
                    db.session.add(
                        TrackTag(
                            track_id=track.id,
                            tag=tag,
                        )
                    )

                created_tracks_count += 1

            db.session.commit()

            flash(f"Release created successfully with {created_tracks_count} tracks.", "success")
            return redirect(url_for("admin.tracks", program_id=program.id, release_id=release.id))

        if form_action == "create_track":
            release_id = request.form.get("release_id", type=int)
            slot_number = request.form.get("slot_number", type=int)

            release = Release.query.get_or_404(release_id)
            program = release.program

            if slot_number is None:
                flash("Track number is required.", "error")
                return redirect(request.referrer or url_for("admin.tracks"))

            slot = get_track_slot_or_none(program.id, slot_number)

            if slot is None:
                flash("Invalid track slot for this program.", "error")
                return redirect(request.referrer or url_for("admin.tracks"))

            title = request.form.get("title", "").strip()
            artist = request.form.get("artist", "").strip()

            if not title or not artist:
                flash("Title and artist are required.", "error")
                return redirect(request.referrer or url_for("admin.tracks"))

            variant_type = request.form.get("variant_type", "main")
            source_code = request.form.get("source_code", "").strip() or None

            source_track_number = normalise_source_track_number(
                variant_type=variant_type,
                source_track_number=request.form.get("source_track_number", ""),
                slot_number=slot_number,
            )

            segment = request.form.get("segment", "").strip().upper() or None

            if segment is None and variant_type == "main":
                segment = get_segment_from_source_track_number(source_track_number)

            group_key = request.form.get("group_key", "").strip()

            if not group_key:
                group_key = build_default_group_key(
                    program=program,
                    release=release,
                    variant_type=variant_type,
                    source_track_number=source_track_number,
                    source_code=source_code,
                )

            track = Track(
                program_id=program.id,
                release_id=release.id,
                slot_id=slot.id,
                source_code=source_code,
                group_key=group_key,
                segment=segment,
                variant_type=variant_type,
                source_track_number=source_track_number,
                title=title,
                artist=artist,
                duration=request.form.get("duration", "").strip() or None,
                genre=request.form.get("genre", "").strip() or None,
                difficulty=request.form.get("difficulty", "").strip() or None,
            )

            db.session.add(track)
            db.session.flush()

            tags = parse_tags(request.form.get("tags", ""))

            for tag in tags:
                db.session.add(
                    TrackTag(
                        track_id=track.id,
                        tag=tag,
                    )
                )

            db.session.commit()

            flash("Track created successfully.", "success")
            return redirect(request.referrer or url_for("admin.tracks"))

        track_id = request.form.get("track_id")
        genre = request.form.get("genre") or None
        difficulty = request.form.get("difficulty") or None
        tags_raw = request.form.get("tags") or ""

        track = Track.query.get_or_404(track_id)

        track.genre = genre
        track.difficulty = difficulty

        TrackTag.query.filter_by(track_id=track.id).delete()

        tags = parse_tags(tags_raw)

        for tag in tags:
            db.session.add(
                TrackTag(
                    track_id=track.id,
                    tag=tag,
                )
            )

        db.session.commit()

        flash("Track updated successfully.", "success")
        return redirect(request.referrer or url_for("admin.tracks"))

    program_id = request.args.get("program_id", type=int)
    release_id = request.args.get("release_id", type=int)
    slot_number = request.args.get("slot_number", type=int)
    variant_type = request.args.get("variant_type")
    search = request.args.get("search", "").strip()

    query = (
        Track.query
        .join(Program, Track.program_id == Program.id)
        .join(Release, Track.release_id == Release.id)
        .join(TrackSlot, Track.slot_id == TrackSlot.id)
    )

    if program_id:
        query = query.filter(Track.program_id == program_id)

    if release_id:
        query = query.filter(Track.release_id == release_id)

    if slot_number:
        query = query.filter(TrackSlot.number == slot_number)

    if variant_type:
        query = query.filter(Track.variant_type == variant_type)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            db.or_(
                Track.title.ilike(search_pattern),
                Track.artist.ilike(search_pattern),
                Track.source_code.ilike(search_pattern),
                Track.group_key.ilike(search_pattern),
            )
        )

    tracks = (
        query
        .order_by(
            Program.name.asc(),
            Release.sort_order.desc(),
            TrackSlot.number.asc(),
            Track.source_track_number.asc(),
            Track.title.asc(),
        )
        .limit(300)
        .all()
    )

    programs = Program.query.order_by(Program.name).all()

    releases_query = Release.query.order_by(
        Release.sort_order.desc()
    )

    if program_id:
        releases_query = releases_query.filter_by(program_id=program_id)

    releases = releases_query.all()

    existing_genres = [
        row[0]
        for row in db.session.query(Track.genre)
        .filter(Track.genre.isnot(None))
        .filter(Track.genre != "")
        .distinct()
        .order_by(Track.genre)
        .all()
    ]

    existing_difficulties = [
        row[0]
        for row in db.session.query(Track.difficulty)
        .filter(Track.difficulty.isnot(None))
        .filter(Track.difficulty != "")
        .distinct()
        .order_by(Track.difficulty)
        .all()
    ]

    existing_tags = [
        row[0]
        for row in db.session.query(TrackTag.tag)
        .filter(TrackTag.tag.isnot(None))
        .filter(TrackTag.tag != "")
        .distinct()
        .order_by(TrackTag.tag)
        .all()
    ]

    all_releases = (
        Release.query
        .join(Program, Release.program_id == Program.id)
        .order_by(
            Program.name.asc(),
            Release.sort_order.asc(),
        )
        .all()
    )
    return render_template(
        "admin/tracks.html",
        tracks=tracks,
        programs=programs,
        releases=releases,
        selected_program_id=program_id,
        selected_release_id=release_id,
        selected_slot_number=slot_number,
        selected_variant_type=variant_type,
        search=search,
        existing_genres=existing_genres,
        existing_difficulties=existing_difficulties,
        existing_tags=existing_tags,
        all_releases=all_releases,
    )