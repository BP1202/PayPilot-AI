import sys
from logging.config import fileConfig
from pathlib import Path

# Ensure backend root is on sys.path so app modules are discoverable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from alembic import context
from app.core.config import settings
from app.core.database import Base
from sqlalchemy import engine_from_config, pool

# Model MetaData object for 'autogenerate' support
target_metadata = Base.metadata


def get_target_url(cfg=None) -> str:
    target_cfg = cfg or (
        context.config if getattr(context, "_proxy", None) is not None else None
    )
    if target_cfg is not None:
        ini_url = target_cfg.get_main_option("sqlalchemy.url")
        if (
            ini_url
            and not ini_url.startswith("driver://")
            and not ini_url.startswith("postgresql://user:pass")
        ):
            return ini_url
    return settings.DATABASE_URL


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_target_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    config = context.config
    configuration = (
        config.get_section(config.config_ini_section, {}) if config else {}
    ) or {}
    configuration["sqlalchemy.url"] = get_target_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


# Run migrations only when executed within an active Alembic runner context
if getattr(context, "_proxy", None) is not None:
    config = context.config
    if config is not None and config.config_file_name is not None:
        fileConfig(config.config_file_name)

    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()
