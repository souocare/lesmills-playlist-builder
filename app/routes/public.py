from flask import Blueprint, abort, render_template, request

from app.services.playlist_builder import (
    build_empty_playlist_slots,
    build_playlist_with_single_random_track,
    get_catalog_releases,
    get_track_counts_by_slot,
    sort_releases_newest_first,
    sort_releases_oldest_first,
)
from app.services.program_repository import (
    get_all_programs,
    get_program_by_slug,
    get_release_by_code,
    program_to_builder_dict,
    release_to_dict,
)

from flask import flash, redirect, url_for
from app.database import programs_db as programs_db
from app.models import Track
from app.database import programs_db as db
from app.user_models import TrackChangeSuggestion


public_bp = Blueprint("public", __name__)


def parse_int_field(field_name: str) -> int | None:
    value = request.form.get(field_name)

    if value is None or value == "":
        return None

    try:
        return int(float(value))
    except ValueError:
        return None


def parse_checkbox(field_name: str) -> bool:
    return request.form.get(field_name) == "on"


def parse_int_list(field_name: str) -> list[int]:
    values = request.form.getlist(field_name)

    parsed_values = []

    for value in values:
        try:
            parsed_values.append(int(float(value)))
        except ValueError:
            continue

    return parsed_values

def parse_string_list(field_name: str) -> list[str]:
    return [
        value
        for value in request.form.getlist(field_name)
        if value
    ]

@public_bp.route("/")
def home():
    programs = get_all_programs()

    return render_template(
        "home.html",
        programs=programs,
    )


@public_bp.route("/<slug>", methods=["GET", "POST"])
def program_detail(slug: str):
    program = get_program_by_slug(slug)

    if program is None:
        abort(404)

    program_data = program_to_builder_dict(program)

    releases = sort_releases_newest_first(program_data["releases"])
    releases_oldest_first = sort_releases_oldest_first(program_data["releases"])
    track_slots = program_data["track_slots"]

    oldest_release_number = None
    exclude_latest_release = False
    most_recent_limit = None
    manually_excluded_release_codes = []

    catalog_releases = program_data["releases"]
    playlist_slots = build_empty_playlist_slots(track_slots)

    if request.method == "POST":
        oldest_release_number = parse_int_field("oldest_release_number")
        exclude_latest_release = parse_checkbox("exclude_latest_release")
        most_recent_limit = parse_int_field("most_recent_limit")
        manually_excluded_release_codes = parse_string_list("excluded_release_codes")

        catalog_releases = get_catalog_releases(
            releases=program_data["releases"],
            oldest_release_number=oldest_release_number,
            exclude_latest_release=exclude_latest_release,
            most_recent_limit=most_recent_limit,
            manually_excluded_release_codes=manually_excluded_release_codes,
        )

        random_slot_number = parse_int_field("random_slot_number")

        if random_slot_number is not None:
            playlist_slots = build_playlist_with_single_random_track(
                track_slots=track_slots,
                catalog_releases=catalog_releases,
                slot_number=random_slot_number,
            )

    all_track_counts_by_slot = get_track_counts_by_slot(program_data["releases"])
    filtered_track_counts_by_slot = get_track_counts_by_slot(catalog_releases)

    return render_template(
        "public/program_detail.html",
        program=program_data["program"],
        releases=releases,
        releases_oldest_first=releases_oldest_first,
        catalog_releases=catalog_releases,
        oldest_release_number=oldest_release_number,
        exclude_latest_release=exclude_latest_release,
        most_recent_limit=most_recent_limit,
        manually_excluded_release_codes=manually_excluded_release_codes,
        playlist_slots=playlist_slots,
        all_track_counts_by_slot=all_track_counts_by_slot,
        filtered_track_counts_by_slot=filtered_track_counts_by_slot,
    )


@public_bp.route("/<slug>/<release_code>")
def release_detail(slug: str, release_code: str):
    program = get_program_by_slug(slug)

    if program is None:
        abort(404)

    release = get_release_by_code(program, release_code)

    if release is None:
        abort(404)

    release_data = release_to_dict(release)

    return render_template(
        "public/release_detail.html",
        program={
            "name": program.name,
            "slug": program.slug,
            "description": program.description,
        },
        release=release_data,
    )

@public_bp.route("/suggest-track-change", methods=["POST"])
def suggest_track_change():
    track_id = request.form.get("track_id", type=int)

    if track_id is None:
        abort(400)

    track = Track.query.get_or_404(track_id)

    suggestion = TrackChangeSuggestion(
        track_id=track.id,
        program_slug=track.release.program.slug,
        release_code=track.release.code,
        suggested_title=request.form.get("title") or None,
        suggested_artist=request.form.get("artist") or None,
        suggested_duration=request.form.get("duration") or None,
        suggested_genre=request.form.get("genre") or None,
        suggested_difficulty=request.form.get("difficulty") or None,
        suggested_tags=request.form.get("tags") or None,
        notes=request.form.get("notes") or None,
        status="pending",
    )

    db.session.add(suggestion)
    db.session.commit()

    flash("Suggestion sent and waiting for review.", "success")

    return redirect(url_for("public.program_detail", slug=track.release.program.slug))