/**
 * Kanban column component for a status
 */

import { type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { StatusFull, ContactListItem } from '@/types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: StatusFull;
  contacts: ContactListItem[];
  onContactClick: (contact: ContactListItem) => void;
}

export function KanbanColumn({
  status,
  contacts,
  onContactClick,
}: KanbanColumnProps): ReactNode {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: {
      type: 'column',
      status,
    },
  });

  const contactIds = contacts.map((c) => c.id);

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[320px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{status.name}</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {contacts.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg p-2 transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border-2 border-transparent'
        }`}
      >
        <SortableContext items={contactIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <KanbanCard
                key={contact.id}
                contact={contact}
                onClick={() => { onContactClick(contact); }}
              />
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No contacts
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
