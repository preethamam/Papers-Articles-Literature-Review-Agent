from pydantic_settings import BaseSettings
from pathlib import Path

# Articles folder lives inside the v2 project (copied from v1)
_DEFAULT_ARTICLES = Path(__file__).parent.parent.parent / "Articles"


class Settings(BaseSettings):
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"
    articles_dir: Path = _DEFAULT_ARTICLES
    data_dir: Path = Path(__file__).parent.parent / "data"
    embedding_model: str = "allenai-specter"
    chunk_size: int = 600
    chunk_overlap: int = 100
    top_k: int = 10

    @property
    def chroma_dir(self) -> Path:
        return self.data_dir / "chroma"

    @property
    def extractions_dir(self) -> Path:
        return self.data_dir / "results" / "extractions"

    @property
    def manifest_path(self) -> Path:
        return self.data_dir / "ingest_manifest.json"

    model_config = {"env_file": "../.env"}


settings = Settings()

for _dir in [settings.chroma_dir, settings.extractions_dir]:
    _dir.mkdir(parents=True, exist_ok=True)
