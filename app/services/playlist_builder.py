import random
from collections import defaultdict
from typing import Any


def sort_releases_newest_first(releases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        releases,
        key=lambda release: release["number"],
        reverse=True,
    )


def sort_releases_oldest_first(releases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        releases,
        key=lambda release: release["number"],
    )

def get_release_sort_order(release: dict) -> float:
    return float(release.get("sort_order", release.get("number", 0)))


def sort_releases_newest_first(releases: list[dict]) -> list[dict]:
    return sorted(
        releases,
        key=get_release_sort_order,
        reverse=True,
    )


def sort_releases_oldest_first(releases: list[dict]) -> list[dict]:
    return sorted(
        releases,
        key=get_release_sort_order,
    )


def get_catalog_releases(
    releases: list[dict],
    oldest_release_number: int | None = None,
    exclude_latest_release: bool = False,
    most_recent_limit: int | None = None,
    manually_excluded_release_codes: list[str] | None = None,
) -> list[dict]:
    manually_excluded_release_numbers = manually_excluded_release_numbers or []

    catalog = sort_releases_oldest_first(releases)

    if oldest_release_number is not None:
        catalog = [
            release
            for release in catalog
            if get_release_sort_order(release) >= oldest_release_number
        ]

    if exclude_latest_release and catalog:
        latest_release_sort_order = max(
            get_release_sort_order(release)
            for release in catalog
        )

        catalog = [
            release
            for release in catalog
            if get_release_sort_order(release) != latest_release_sort_order
        ]

    if most_recent_limit is not None and most_recent_limit > 0:
        catalog = sort_releases_newest_first(catalog)
        catalog = catalog[:most_recent_limit]
        catalog = sort_releases_oldest_first(catalog)

    if manually_excluded_release_codes:
        catalog = [
            release
            for release in catalog
            if str(release.get("code")) not in manually_excluded_release_codes
        ]

    return catalog


def get_tracks_by_slot(
    releases: list[dict[str, Any]],
) -> dict[int, list[dict[str, Any]]]:
    tracks_by_slot: dict[int, list[dict[str, Any]]] = defaultdict(list)

    for release in releases:
        release_number = release["number"]
        release_title = release["title"]

        for track in release.get("tracks", []):
            track_with_release = {
                **track,
                "release_number": release_number,
                "release_title": release_title,
            }

            tracks_by_slot[track["slot"]].append(track_with_release)

    return tracks_by_slot


def get_track_counts_by_slot(
    releases: list[dict[str, Any]],
) -> dict[int, int]:
    tracks_by_slot = get_tracks_by_slot(releases)

    return {
        slot_number: len(tracks)
        for slot_number, tracks in tracks_by_slot.items()
    }


def build_empty_playlist_slots(
    track_slots: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [
        {
            "slot": slot["number"],
            "slot_name": slot["name"],
            "selected_track": None,
        }
        for slot in track_slots
    ]


def choose_random_track_for_slot(
    releases: list[dict[str, Any]],
    slot_number: int,
) -> dict[str, Any] | None:
    tracks_by_slot = get_tracks_by_slot(releases)
    candidates = tracks_by_slot.get(slot_number, [])

    if not candidates:
        return None

    return random.choice(candidates)


def build_playlist_with_single_random_track(
    track_slots: list[dict[str, Any]],
    catalog_releases: list[dict[str, Any]],
    slot_number: int,
) -> list[dict[str, Any]]:
    playlist_slots = build_empty_playlist_slots(track_slots)
    selected_track = choose_random_track_for_slot(
        releases=catalog_releases,
        slot_number=slot_number,
    )

    for playlist_slot in playlist_slots:
        if playlist_slot["slot"] == slot_number:
            playlist_slot["selected_track"] = selected_track
            break

    return playlist_slots