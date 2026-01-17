/**
 * Kanban board component with drag and drop
 */

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ContactListItem, StatusFull } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Spinner } from '@/components/ui/Spinner';

interface KanbanBoardProps {
  statuses: StatusFull[];
  contacts: ContactListItem[];
  isLoading: boolean;
  onContactClick: (contact: ContactListItem) => void;
  onContactMove: (contactId: string, statusId: string, position: number) => void;
}

export function KanbanBoard({
  statuses,
  contacts,
  isLoading,
  onContactClick,
  onContactMove,
}: KanbanBoardProps): ReactNode {
  const [activeContact, setActiveContact] = useState<ContactListItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group contacts by status and sort by position
  const contactsByStatus = useMemo(() => {
    const grouped = new Map<string, ContactListItem[]>();
    
    // Initialize with empty arrays for all statuses
    statuses.forEach((status) => {
      grouped.set(status.id, []);
    });

    // Add a special "no-status" group for contacts without status
    grouped.set('no-status', []);

    // Group contacts
    contacts.forEach((contact) => {
      const statusId = contact.status?.id;
      if (statusId) {
        const statusContacts = grouped.get(statusId) ?? [];
        statusContacts.push(contact);
        grouped.set(statusId, statusContacts);
      } else {
        // Contacts without status go to the "no-status" group
        const noStatusContacts = grouped.get('no-status') ?? [];
        noStatusContacts.push(contact);
        grouped.set('no-status', noStatusContacts);
      }
    });

    // Sort contacts within each status by sort_order_in_status
    grouped.forEach((contactList, statusId) => {
      contactList.sort((a, b) => {
        const orderA = a.sort_order_in_status ?? 0;
        const orderB = b.sort_order_in_status ?? 0;
        return orderA - orderB;
      });
      grouped.set(statusId, contactList);
    });

    return grouped;
  }, [contacts, statuses]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'contact') {
      setActiveContact(active.data.current.contact as ContactListItem);
    }
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Optional: Add visual feedback during drag
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveContact(null);

      if (!over) return;

      const activeContact = active.data.current?.contact as ContactListItem | undefined;
      if (!activeContact) return;

      // Check if dropped over a column
      if (over.data.current?.type === 'column') {
        const status = over.data.current.status as StatusFull;
        const targetStatusId = status.id;
        const targetContacts = contactsByStatus.get(targetStatusId) ?? [];
        const position = targetContacts.length;

        onContactMove(activeContact.id, targetStatusId, position);
      }
      // Check if dropped over another contact
      else if (over.data.current?.type === 'contact') {
        const overContact = over.data.current.contact as ContactListItem;
        const targetStatusId = overContact.status?.id;
        
        if (targetStatusId) {
          const targetContacts = contactsByStatus.get(targetStatusId) ?? [];
          const overIndex = targetContacts.findIndex((c) => c.id === overContact.id);
          
          onContactMove(activeContact.id, targetStatusId, overIndex);
        }
      }
    },
    [contactsByStatus, onContactMove]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Create a virtual "No Status" status object
  const noStatus: StatusFull = {
    id: 'no-status',
    name: 'No Status',
    sort_order: -1, // Display first
    is_active: true,
    contact_count: contactsByStatus.get('no-status')?.length ?? 0,
  };

  // Filter only active statuses and combine with no-status
  const activeStatuses = statuses.filter((status) => status.is_active);
  const allStatuses = [noStatus, ...activeStatuses];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {allStatuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            contacts={contactsByStatus.get(status.id) ?? []}
            onContactClick={onContactClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeContact ? (
          <KanbanCard contact={activeContact} onClick={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
