/**
 * Kanban page for contact management
 */

import { type ReactNode, useCallback, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { KanbanBoard, StatusManagement } from '@/components/kanban';
import { FilterPanel } from '@/components/kanban/FilterPanel';
import { PersonCard } from '@/components/contacts/PersonCard';
import { Button } from '@/components/ui/Button';
import { useStatuses } from '@/hooks/useStatuses';
import { useContacts } from '@/hooks/useContacts';
import { useMoveContact } from '@/hooks/useKanban';
import type { ContactListItem, ContactListParams } from '@/types';

export function KanbanPage(): ReactNode {
  const [selectedContact, setSelectedContact] = useState<ContactListItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showStatusManagement, setShowStatusManagement] = useState(false);
  const [filters, setFilters] = useState<ContactListParams>({});

  const { data: statusesData, isLoading: isLoadingStatuses } = useStatuses();
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts(filters);
  const moveContact = useMoveContact();

  const statuses = statusesData?.data ?? [];
  const contacts = contactsData?.data ?? [];

  const handleContactMove = useCallback(
    (contactId: string, statusId: string, position: number) => {
      moveContact.mutate({
        contact_id: contactId,
        status_id: statusId,
        position,
      });
    },
    [moveContact]
  );

  const handleFiltersChange = useCallback((newFilters: ContactListParams) => {
    setFilters(newFilters);
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kanban Board</h1>
            <p className="mt-2 text-gray-600">
              Organize your contacts by status
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => { setShowStatusManagement(true); }}
              leftIcon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              }
            >
              Manage Statuses
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setShowFilters(!showFilters); }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="max-w-md">
            <FilterPanel filters={filters} onFiltersChange={handleFiltersChange} />
          </div>
        )}

        <div className="overflow-x-auto">
          <KanbanBoard
            statuses={statuses}
            contacts={contacts}
            isLoading={isLoadingStatuses || isLoadingContacts}
            onContactClick={setSelectedContact}
            onContactMove={handleContactMove}
          />
        </div>

        {selectedContact && (
          <PersonCard
            contactId={selectedContact.id}
            isOpen={!!selectedContact}
            onClose={() => { setSelectedContact(null); }}
          />
        )}

        <StatusManagement
          isOpen={showStatusManagement}
          onClose={() => { setShowStatusManagement(false); }}
        />
      </div>
    </Layout>
  );
}
