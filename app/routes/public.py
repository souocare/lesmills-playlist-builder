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
    manually_excluded_release_numbers = []

    catalog_releases = program_data["releases"]
    playlist_slots = build_empty_playlist_slots(track_slots)

    if request.method == "POST":
        oldest_release_number = parse_int_field("oldest_release_number")
        exclude_latest_release = parse_checkbox("exclude_latest_release")
        most_recent_limit = parse_int_field("most_recent_limit")
        manually_excluded_release_numbers = parse_int_list("excluded_release_numbers")

        catalog_releases = get_catalog_releases(
            releases=program_data["releases"],
            oldest_release_number=oldest_release_number,
            exclude_latest_release=exclude_latest_release,
            most_recent_limit=most_recent_limit,
            manually_excluded_release_numbers=manually_excluded_release_numbers,
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
        manually_excluded_release_numbers=manually_excluded_release_numbers,
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