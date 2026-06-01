import os


class Settings:
    app_name = os.getenv("APP_NAME", "Inventory & Order Management API")
    _database_url = os.getenv("DATABASE_URL")
    if _database_url and _database_url.startswith("postgres://"):
        _database_url = _database_url.replace("postgres://", "postgresql://", 1)
    database_url = _database_url
    cors_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    seed_demo_data = os.getenv("SEED_DEMO_DATA", "false").lower() == "true"


settings = Settings()
