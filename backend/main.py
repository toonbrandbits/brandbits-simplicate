import os
import pathlib
import json
import dotenv
from fastapi import FastAPI, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware

dotenv.load_dotenv()

from databutton_app.mw.auth_mw import AuthConfig, get_authorized_user


def get_router_config() -> dict:
    try:
        # Note: This file is not available to the agent
        cfg = json.loads(open("routers.json").read())
    except:
        return False
    return cfg


def is_auth_disabled(router_config: dict, name: str) -> bool:
    return router_config["routers"][name]["disableAuth"]


def import_api_routers() -> APIRouter:
    """Create top level router including all user defined endpoints."""
    routes = APIRouter(prefix="/routes")

    router_config = get_router_config()

    src_path = pathlib.Path(__file__).parent

    # Import API routers from "src/app/apis/*/__init__.py"
    apis_path = src_path / "app" / "apis"

    api_names = [
        p.relative_to(apis_path).parent.as_posix()
        for p in apis_path.glob("*/__init__.py")
    ]

    api_module_prefix = "app.apis."

    for name in api_names:
        print(f"Importing API: {name}")
        try:
            api_module = __import__(api_module_prefix + name, fromlist=[name])
            api_router = getattr(api_module, "router", None)
            if isinstance(api_router, APIRouter):
                routes.include_router(
                    api_router,
                    dependencies=(
                        []
                        if is_auth_disabled(router_config, name)
                        else [Depends(get_authorized_user)]
                    ),
                )
        except Exception as e:
            print(e)
            continue

    print(routes.routes)

    return routes


def get_stack_auth_config() -> dict | None:
    # First, check for custom StackAuth environment variables
    custom_jwks_url = os.environ.get("STACK_AUTH_JWKS_URL")
    custom_project_id = os.environ.get("STACK_AUTH_PROJECT_ID")
    
    if custom_jwks_url and custom_project_id:
        print("Using custom StackAuth configuration from environment variables")
        return {
            "jwks_url": custom_jwks_url, 
            "audience": custom_project_id, 
            "header": "authorization"
        }
    
    # Fall back to Databutton's StackAuth configuration
    extensions = os.environ.get("DATABUTTON_EXTENSIONS", "[]")
    try:
        extensions = json.loads(extensions)
    except Exception:
        return None

    for ext in extensions:
        if ext.get("name") == "stack-auth":
            cfg = ext.get("config", {})
            jwks_url = cfg.get("jwksUrl")
            project_id = cfg.get("projectId")
            if jwks_url and project_id:
                print("Using Databutton StackAuth configuration")
                return {"jwks_url": jwks_url, "audience": project_id, "header": "authorization"}

    return None


def get_firebase_config() -> dict | None:
    extensions = os.environ.get("DATABUTTON_EXTENSIONS", "[]")
    extensions = json.loads(extensions)

    for ext in extensions:
        if ext["name"] == "firebase-auth":
            return ext["config"]["firebaseConfig"]

    return None


def create_app() -> FastAPI:
    """Create the app. This is called by uvicorn with the factory option to construct the app object."""
    app = FastAPI(
        title="Brandbits Time Tracking API",
        description="API for time tracking application",
        version="1.0.0"
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://brandbits-simplicate-frontend.onrender.com", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add a root route to provide API information
    @app.get("/")
    async def root():
        return {
            "message": "Brandbits Time Tracking API",
            "version": "1.0.0",
            "docs": "/docs",
            "available_routes": [
                "/routes/time-entries",
                "/routes/projects", 
                "/routes/companies",
                "/routes/services"
            ]
        }
    
    # Add health check endpoint
    @app.get("/health")
    async def health():
        return {"status": "healthy"}
    
    app.include_router(import_api_routers())

    for route in app.routes:
        if hasattr(route, "methods"):
            for method in route.methods:
                print(f"{method} {route.path}")

    # Prefer Stack Auth if configured; otherwise fall back to Firebase
    stack_auth_config = get_stack_auth_config()
    if stack_auth_config is not None:
        print("Stack Auth config found")
        app.state.auth_config = AuthConfig(**stack_auth_config)
        return app

    firebase_config = get_firebase_config()

    if firebase_config is None:
        print("No auth config found (Stack Auth or Firebase)")
        app.state.auth_config = None
    else:
        print("Firebase config found")
        auth_config = {
            "jwks_url": "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
            "audience": firebase_config["projectId"],
            "header": "authorization",
        }

        app.state.auth_config = AuthConfig(**auth_config)

    return app


app = create_app()
