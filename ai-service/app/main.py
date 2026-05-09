# AI Analysis Layer - FastAPI Entry Point
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.api.routes.health import health_router
from app.api.routes.analysis import analysis_router
from app.api.routes.embeddings import embeddings_router
from app.api.routes.mentor_chat import mentor_chat_router


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name}...")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"AI Model: {settings.openai_model}")
    logger.info(f"AI Configured: {bool(settings.openai_api_key)}")
    yield
    logger.info(f"Shutting down {settings.app_name}...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.app_name,
        description=(
            "AI-powered code analysis microservice for the Code Mentor platform. "
            "Combines static analysis tools (ESLint, Bandit, etc.) with AI code review "
            "using OpenAI GPT-5.1-codex-mini for comprehensive feedback."
        ),
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Register routers
    app.include_router(health_router)
    app.include_router(analysis_router)
    app.include_router(embeddings_router)
    app.include_router(mentor_chat_router)
    
    # Serve static files (web UI)
    static_dir = Path(__file__).parent.parent / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir), html=True), name="static")
        
        @app.get("/", include_in_schema=False)
        async def root():
            """Redirect root to web UI."""
            return RedirectResponse(url="/static/index.html")
    
    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
