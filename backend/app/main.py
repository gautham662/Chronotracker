from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import users, skills, sessions

# 10,000-Foot View:
# This is the central entry point of our backend.
# It initializes the FastAPI app, links database tables on startup,
# configures CORS policies (allowing our Tauri app to request resources),
# and mounts authentication, user management, skill tracking, and session routers.

# Bind and generate database tables defined in database models (models.py) on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ChronoSkill Tracker API",
    description="Backend service for tracking and leveling up custom skills.",
    version="1.0.0"
)

# CORS (Cross-Origin Resource Sharing) middleware setup.
# Tauri apps run inside a local webview under custom protocol schemes (like tauri://localhost).
# We allow credentials and wildcard origins during development to prevent connection errors.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to specific origins (e.g. ['tauri://localhost'])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(users.router)
app.include_router(users.user_router)
app.include_router(skills.router)
app.include_router(sessions.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the ChronoSkill Tracker API. Go to /docs for interactive swagger API documentation."
    }
