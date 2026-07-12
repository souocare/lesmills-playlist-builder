from app import create_app
from app.database import programs_db as db
from app import user_models  # noqa: F401


def main() -> None:
    app = create_app()

    with app.app_context():
        db.create_all(bind_key="users")

    print("users.db created successfully.")


if __name__ == "__main__":
    main()