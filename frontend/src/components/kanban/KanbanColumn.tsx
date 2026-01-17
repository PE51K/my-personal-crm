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
    <div className="flex flex-col h-full min-w-[320px] max-w-[340px] bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{status.name}</h2>
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 text-xs font-semibold text-gray-700 bg-gray-200 px-2 rounded-full">
            {contacts.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg p-3 min-h-[400px] transition-all duration-200 ${
          isOver
            ? 'bg-primary-50 border-2 border-dashed border-primary-400 shadow-inner'
            : contacts.length === 0
              ? 'bg-white border-2 border-dashed border-gray-300'
              : 'bg-transparent border-2 border-transparent'
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
              <div className="text-center py-16 text-gray-400 text-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="font-medium text-gray-500">Empty</p>
                <p className="text-xs mt-1 text-gray-400">Drop contacts here</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
