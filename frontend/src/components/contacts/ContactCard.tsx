/**
 * Contact card component for lists and Kanban
 */

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { ContactListItem } from '@/types';

interface ContactCardProps {
  contact: ContactListItem;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function ContactCard({
  contact,
  onClick,
  className = '',
  compact = false,
}: ContactCardProps): ReactNode {
  const fullName = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(' ');

  if (compact) {
    return (
      <Card
        hover
        padding="sm"
        className={`cursor-pointer ${className}`}
        onClick={onClick}
      >
        <div className="flex items-center space-x-3">
          <Avatar src={contact.photo_url} name={fullName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {contact.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} size="sm">
                    {tag.name}
                  </Badge>
                ))}
                {contact.tags.length > 2 && (
                  <Badge size="sm" variant="default">
                    +{contact.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      hover
      padding="sm"
      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3 p-2">
        <Avatar src={contact.photo_url} name={fullName} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {fullName}
          </h3>
          {contact.status && (
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200">
                {contact.status.name}
              </span>
            </div>
          )}
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.tags.slice(0, 2).map((tag) => (
                <Badge key={tag.id} variant="primary" size="sm">
                  {tag.name}
                </Badge>
              ))}
              {contact.tags.length > 2 && (
                <Badge size="sm" variant="default">
                  +{contact.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
