from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from backend.routers import ai

app = FastAPI(title="Perler Beads Generator")
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

static_dir = Path(__file__).resolve().parent.parent
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
