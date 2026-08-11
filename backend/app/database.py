import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 10,000-Foot View:
# This module configures our SQLite database using SQLAlchemy ORM.
# It establishes the database file, starts the DB engine, and provides
# a session generator for database transactions.

# We locate the database file inside the backend directory.
# In production, this path could be set via environment variables.
DATABASE_URL = "sqlite:///./chronoskill.db"

# Create the SQLAlchemy engine.
# "connect_args={'check_same_thread': False}" is required specifically for SQLite
# because SQLite only allows one thread to write/read by default, but FastAPI is async
# and runs requests across multiple threads.
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Each instance of the SessionLocal class will be a database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our SQLAlchemy models.
Base = declarative_base()

# Dependency generator that opens a database session for a single request,
# yields it to the controller logic, and guarantees it closes when the request is done.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
