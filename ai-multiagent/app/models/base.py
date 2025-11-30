"""Base model with database table configuration for Pydantic v2."""

from typing import ClassVar

from pydantic import BaseModel, ConfigDict

# Schema name for AI multiagent tables (separate from backend's public schema)
AI_SCHEMA = "ai_multiagent"


class TableModel(BaseModel):
    """
    Base model for database-backed entities.

    Provides table metadata configuration for Supabase integration.
    Subclasses should define __tablename__ to specify the database table.

    Example:
        class Patient(TableModel):
            __tablename__: ClassVar[str] = "patients"
            __schema__: ClassVar[str] = "ai_multiagent"  # optional override

            phone_number: str
            name: str | None = None
    """

    model_config = ConfigDict(
        # Allow population by field name or alias
        populate_by_name=True,
        # Use enum values for serialization
        use_enum_values=True,
        # Validate default values
        validate_default=True,
        # Extra fields are ignored (useful for DB responses with extra columns)
        extra="ignore",
    )

    # Database table name - must be overridden in subclasses
    __tablename__: ClassVar[str] = ""
    # Database schema - defaults to AI_SCHEMA, can be overridden
    __schema__: ClassVar[str] = AI_SCHEMA

    @classmethod
    def get_table_name(cls) -> str:
        """Get the database table name for this model."""
        if not cls.__tablename__:
            raise ValueError(f"{cls.__name__} does not define __tablename__")
        return cls.__tablename__

    @classmethod
    def get_schema(cls) -> str:
        """Get the database schema for this model."""
        return cls.__schema__

    @classmethod
    def get_full_table_path(cls) -> str:
        """Get the full schema.table path."""
        return f"{cls.get_schema()}.{cls.get_table_name()}"
