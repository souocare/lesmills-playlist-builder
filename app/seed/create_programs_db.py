from app import create_app
from app.database import programs_db as db
from app import models  # noqa: F401


def main() -> None:
    app = create_app()

    with app.app_context():
        db.create_all()

    print("programs.db created with empty tables successfully.")


if __name__ == "__main__":
    main()