from flask import Flask

from app.database import programs_db
from app.routes.public import public_bp


def create_app() -> Flask:
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///programs.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    programs_db.init_app(app)

    app.register_blueprint(public_bp)

    return app