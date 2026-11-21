from contextlib import closing
import sqlite3

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session

from app import database


def test_completed_session_persists_and_updates_skill_total(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    engine = create_engine(URL.create("sqlite", database=str(db_path)))

    def get_test_db():
        with Session(engine) as session:
            yield session

    # main creates tables on import. Point that initialization at the test file too.
    monkeypatch.setattr(database, "engine", engine)
    from app.main import app

    monkeypatch.setitem(app.dependency_overrides, database.get_db, get_test_db)
    try:
        database.Base.metadata.create_all(engine)
        with TestClient(app) as client:
            signup = client.post(
                "/auth/signup",
                json={"username": "timer-test", "password": "test-password"},
            )
            assert signup.status_code == 201, signup.text
            headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

            skill = client.post(
                "/skills", headers=headers, json={"name": "Guitar", "focus_minutes": 1}
            )
            assert skill.status_code == 201, skill.text
            assert skill.json()["total_seconds_logged"] == 0
            skill_id = skill.json()["id"]

            response = client.post(
                "/sessions",
                headers=headers,
                json={
                    "skill_id": skill_id,
                    "duration_seconds": 60,
                    "started_at": "2026-01-01T12:00:00Z",
                    "completed_at": "2026-01-01T12:01:00Z",
                    "was_completed": True,
                },
            )
            assert response.status_code == 201, response.text
            session_id = response.json()["id"]
    finally:
        engine.dispose()

    with closing(sqlite3.connect(db_path)) as connection:
        saved_sessions = connection.execute(
            "SELECT id, duration_seconds, was_completed FROM sessions WHERE skill_id = ?",
            (skill_id,),
        ).fetchall()
        saved_total = connection.execute(
            "SELECT total_seconds_logged FROM skills WHERE id = ?", (skill_id,)
        ).fetchone()

    assert saved_sessions == [(session_id, 60, 1)]
    assert saved_total == (60,)


def test_locked_skill_rejects_session_without_changing_saved_data(tmp_path, monkeypatch):
    db_path = tmp_path / "locked-skill.db"
    engine = create_engine(URL.create("sqlite", database=str(db_path)))

    def get_test_db():
        with Session(engine) as session:
            yield session

    from app.main import app

    monkeypatch.setitem(app.dependency_overrides, database.get_db, get_test_db)
    try:
        database.Base.metadata.create_all(engine)
        with TestClient(app) as client:
            signup = client.post(
                "/auth/signup",
                json={"username": "locked-skill-test", "password": "test-password"},
            )
            assert signup.status_code == 201, signup.text
            headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

            for name in ("A", "B", "C"):
                skill = client.post(
                    "/skills", headers=headers, json={"name": name, "priority": 5}
                )
                assert skill.status_code == 201, skill.text

            locked_skill = client.post(
                "/skills", headers=headers, json={"name": "D", "priority": 1}
            )
            assert locked_skill.status_code == 201, locked_skill.text
            skill_id = locked_skill.json()["id"]

            response = client.post(
                "/sessions",
                headers=headers,
                json={
                    "skill_id": skill_id,
                    "duration_seconds": 60,
                    "started_at": "2026-01-01T12:00:00Z",
                    "completed_at": "2026-01-01T12:01:00Z",
                    "was_completed": True,
                },
            )
            assert response.status_code == 403, response.text
            assert "locked" in response.json()["detail"].lower()
            history = client.get("/sessions", headers=headers, params={"skill_id": skill_id})
            assert history.status_code == 200
            assert history.json() == []
    finally:
        engine.dispose()

    with closing(sqlite3.connect(db_path)) as connection:
        session_count = connection.execute(
            "SELECT COUNT(*) FROM sessions WHERE skill_id = ?", (skill_id,)
        ).fetchone()
        saved_total = connection.execute(
            "SELECT total_seconds_logged FROM skills WHERE id = ?", (skill_id,)
        ).fetchone()

    assert session_count == (0,)
    assert saved_total == (0,)
