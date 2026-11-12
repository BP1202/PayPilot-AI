import importlib.util
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from app.core.config import settings
from app.core.database import Base


def load_alembic_env():
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = backend_dir / "alembic" / "env.py"
    spec = importlib.util.spec_from_file_location("alembic_env_module", env_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_alembic_metadata_connected():
    alembic_env = load_alembic_env()
    assert alembic_env.target_metadata is Base.metadata


def test_alembic_config_resolves_script_directory():
    backend_dir = Path(__file__).resolve().parent.parent
    ini_path = backend_dir / "alembic.ini"
    assert ini_path.exists(), "alembic.ini must exist"

    config = Config(str(ini_path))
    script = ScriptDirectory.from_config(config)
    assert script is not None
    versions = list(script.walk_revisions())
    assert isinstance(versions, list)


def test_alembic_env_uses_app_settings_database_url():
    backend_dir = Path(__file__).resolve().parent.parent
    ini_path = backend_dir / "alembic.ini"
    config = Config(str(ini_path))

    alembic_env = load_alembic_env()
    assert hasattr(alembic_env, "get_target_url")
    resolved_url = alembic_env.get_target_url(config)
    assert resolved_url == settings.DATABASE_URL
