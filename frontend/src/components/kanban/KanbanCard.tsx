/**
 * Kanban card component for individual contacts
 */

import { type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ContactListItem } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface KanbanCardProps {
  contact: ContactListItem;
  onClick: () => void;
}

export function KanbanCard({ contact, onClick }: KanbanCardProps): ReactNode {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: contact.id,
    data: {
      type: 'contact',
      contact,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fullName = [contact.first_name, contact.middle_name, contact.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Contact: ${fullName}. Press Space or Enter to open, use arrow keys to move.`}
      className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
    >
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        padding="sm"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <Avatar
            name={fullName}
            src={contact.photo_url ?? undefined}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{fullName}</h3>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} size="sm">
                    {tag.name}
                  </Badge>
                ))}
                {contact.tags.length > 3 && (
                  <Badge size="sm" variant="default">
                    +{contact.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
