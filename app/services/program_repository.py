from app.models import Program, Release, Track, TrackSlot


def get_all_programs() -> list[dict]:
    programs = Program.query.order_by(Program.name).all()

    return [
        {
            "name": program.name,
            "slug": program.slug,
            "description": program.description,
        }
        for program in programs
    ]


def get_program_by_slug(slug: str) -> Program | None:
    return Program.query.filter_by(slug=slug).first()


def release_to_dict(release: Release) -> dict:
    tracks = (
        Track.query
        .filter_by(release_id=release.id)
        .join(TrackSlot, Track.slot_id == TrackSlot.id)
        .order_by(TrackSlot.number)
        .all()
    )

    return {
        "id": release.code,
        "code": release.code,
        "number": release.sort_order,
        "display_number": release.display_number,
        "title": release.title,
        "year": release.year,
        "quarter": release.quarter,
        "sort_order": release.sort_order,
        "tracks": [
            {
                "id": track.id,
                "slot": track.slot.number,
                "slot_name": track.slot.name,
                "title": track.title,
                "artist": track.artist,
                "duration": track.duration,
                "genre": track.genre,
                "difficulty": track.difficulty,
                "tags": [tag.tag for tag in track.tags],
            }
            for track in tracks
        ],
    }


def program_to_builder_dict(program: Program) -> dict:
    track_slots = (
        TrackSlot.query
        .filter_by(program_id=program.id)
        .order_by(TrackSlot.number)
        .all()
    )

    releases = (
        Release.query
        .filter_by(program_id=program.id)
        .order_by(Release.sort_order.desc())
        .all()
    )

    return {
        "program": {
            "name": program.name,
            "slug": program.slug,
            "description": program.description,
        },
        "track_slots": [
            {
                "number": slot.number,
                "name": slot.name,
            }
            for slot in track_slots
        ],
        "releases": [
            release_to_dict(release)
            for release in releases
        ],
    }


def get_release_by_code(program: Program, release_code: str) -> Release | None:
    return (
        Release.query
        .filter_by(program_id=program.id, code=release_code)
        .first()
    )