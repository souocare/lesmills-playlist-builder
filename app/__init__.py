import os

from flask import Flask

from app.database import programs_db
from app.routes.public import public_bp
from app.routes.admin import admin_bp


def create_app() -> Flask:
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY",
        "dev-secret-key-change-me",
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "PROGRAMS_DATABASE_URI",
        "sqlite:///programs.db",
    )

    app.config["SQLALCHEMY_BINDS"] = {
        "users": os.environ.get(
            "USERS_DATABASE_URI",
            "sqlite:///users.db",
        )
    }

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    programs_db.init_app(app)

    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)

    return app