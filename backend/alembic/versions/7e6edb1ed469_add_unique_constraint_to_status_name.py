"""Add unique constraint to status name.

Revision ID: 7e6edb1ed469
Revises: 001
Create Date: 2026-01-17 19:37:13.446867

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7e6edb1ed469"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade database schema."""
    # Add unique constraint to status name
    op.create_unique_constraint("uq_status_name", "statuses", ["name"])


def downgrade() -> None:
    """Downgrade database schema."""
    # Remove unique constraint from status name
    op.drop_constraint("uq_status_name", "statuses", type_="unique")
