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
    <div className="flex flex-col h-full min-w-[300px] max-w-[340px]">
      <div className="sticky top-0 mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{status.name}</h2>
          <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {contacts.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg p-3 min-h-[400px] transition-all duration-200 ${
          isOver 
            ? 'bg-primary-50 border-2 border-primary-300 shadow-md' 
            : 'bg-gray-50/50 border-2 border-gray-200'
        }`}
      >
        <SortableContext items={contactIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {contacts.map((contact) => (
              <KanbanCard
                key={contact.id}
                contact={contact}
                onClick={() => { onContactClick(contact); }}
              />
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="font-medium">No contacts</p>
                <p className="text-xs mt-1">Drag contacts here</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
