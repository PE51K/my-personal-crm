"""Initial database schema.

Revision ID: 001
Revises:
Create Date: 2026-01-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Create app_owner table
    op.create_table(
        "app_owner",
        sa.Column("id", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("supabase_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("id = 1", name="app_owner_single_row"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("supabase_user_id"),
    )
    op.create_index("idx_app_owner_supabase_user_id", "app_owner", ["supabase_user_id"])

    # Create statuses table
    op.create_table(
        "statuses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_statuses_is_active", "statuses", ["is_active"])

    # Create contacts table
    op.create_table(
        "contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("middle_name", sa.Text(), nullable=True),
        sa.Column("last_name", sa.Text(), nullable=True),
        sa.Column("telegram_username", sa.Text(), nullable=True),
        sa.Column("linkedin_url", sa.Text(), nullable=True),
        sa.Column("github_username", sa.Text(), nullable=True),
        sa.Column("met_at", sa.Date(), nullable=True),
        sa.Column("status_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("photo_path", sa.Text(), nullable=True),
        sa.Column("sort_order_in_status", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("position_x", sa.Float(), nullable=True),
        sa.Column("position_y", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["status_id"], ["statuses.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_contacts_status_id", "contacts", ["status_id"])
    op.create_index("idx_contacts_created_at", "contacts", ["created_at"])
    op.create_index("idx_contacts_met_at", "contacts", ["met_at"])

    # Create lookup tables
    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "interests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "occupations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Create join tables
    op.create_table(
        "contact_tags",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("contact_id", "tag_id"),
    )

    op.create_table(
        "contact_interests",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("interest_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["interest_id"], ["interests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("contact_id", "interest_id"),
    )

    op.create_table(
        "contact_occupations",
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("occupation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["occupation_id"], ["occupations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("contact_id", "occupation_id"),
    )

    # Create contact_associations table
    op.create_table(
        "contact_associations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("source_contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("source_contact_id != target_contact_id", name="check_no_self_association"),
        sa.ForeignKeyConstraint(["source_contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_contact_id"], ["contacts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_contact_id", "target_contact_id", name="uq_contact_association"),
    )
    op.create_index("idx_contact_associations_source", "contact_associations", ["source_contact_id"])
    op.create_index("idx_contact_associations_target", "contact_associations", ["target_contact_id"])

    # Create trigger function for updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)

    # Create trigger on contacts table
    op.execute("""
        CREATE TRIGGER update_contacts_updated_at
            BEFORE UPDATE ON contacts
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)

    # Seed default statuses
    op.execute("""
        INSERT INTO statuses (name, sort_order, is_active) VALUES
            ('New', 1, true),
            ('Active', 2, true),
            ('Inactive', 3, true),
            ('Archived', 4, true)
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Downgrade database schema."""
    # Drop all tables in reverse order
    op.drop_table("contact_associations")
    op.drop_table("contact_occupations")
    op.drop_table("contact_interests")
    op.drop_table("contact_tags")
    op.drop_table("occupations")
    op.drop_table("interests")
    op.drop_table("tags")
    op.drop_table("contacts")
    op.drop_table("statuses")
    op.drop_table("app_owner")

    # Drop trigger function
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;")
