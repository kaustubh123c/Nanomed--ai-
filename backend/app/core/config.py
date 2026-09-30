from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    MONGO_URI: str = ""
    MONGO_DB_NAME: str = "nanomed_ai"

    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    GEMINI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Advanced physics engine (merged from Physics-AI): elemental
    # photon-interaction data source. "xcom" = live NIST XCOM lookups
    # (physics.nist.gov), now the active default -- requires internet
    # access + the requests/beautifulsoup4 packages (already in
    # requirements.txt). "offline" = NanoMed's built-in Klein-Nishina +
    # photoelectric model, zero network dependency, kept as a fallback
    # (set MAC_DATA_SOURCE=offline, or pass data_source="offline" per
    # request, to use it instead).
    MAC_DATA_SOURCE: str = "xcom"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
