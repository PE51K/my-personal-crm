/**
 * All contacts page with list view
 */

import { type ReactNode, useCallback, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ContactCard } from '@/components/contacts/ContactCard';
import { PersonCard } from '@/components/contacts/PersonCard';
import { FilterPanel } from '@/components/kanban/FilterPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useContacts } from '@/hooks/useContacts';
import type { ContactListItem, ContactListParams } from '@/types';

export function ContactsPage(): ReactNode {
  const [selectedContact, setSelectedContact] = useState<ContactListItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ContactListParams>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { data: contactsData, isLoading } = useContacts({
    ...filters,
    search: searchQuery || undefined,
  } as ContactListParams);

  const contacts = contactsData?.data ?? [];
  const pagination = contactsData?.pagination;

  const handleFiltersChange = useCallback((newFilters: ContactListParams) => {
    setFilters(newFilters);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Contacts</h1>
            <p className="mt-2 text-gray-600">
              Browse and manage all your contacts
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => { setShowFilters(!showFilters); }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl">
          <Input
            type="text"
            placeholder="Search contacts by name, email, or company..."
            value={searchQuery}
            onChange={(e) => { handleSearchChange(e.target.value); }}
            className="h-12 text-base"
            leftIcon={
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="max-w-md">
            <FilterPanel filters={filters} onFiltersChange={handleFiltersChange} />
          </div>
        )}

        {/* Contacts Count */}
        {pagination && (
          <div className="text-sm text-gray-600">
            Showing {contacts.length} of {pagination.total_items} contacts
          </div>
        )}

        {/* Contacts List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonList count={6} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 mb-6">
              <svg
                className="h-8 w-8 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || Object.keys(filters).length > 0
                ? 'No contacts found'
                : 'Your network awaits'}
            </h3>
            <p className="text-base text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filters to find what you\'re looking for'
                : 'Start building your professional network by adding your first contact'}
            </p>
            {!(searchQuery || Object.keys(filters).length > 0) && (
              <Button 
                onClick={() => { window.location.href = '/contacts/add'; }}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Add Your First Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => { setSelectedContact(contact); }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { handlePageChange(pagination.page - 1); }}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { handlePageChange(pagination.page + 1); }}
              disabled={pagination.page >= pagination.total_pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {selectedContact && (
        <PersonCard
          contactId={selectedContact.id}
          isOpen={!!selectedContact}
          onClose={() => { setSelectedContact(null); }}
        />
      )}
    </Layout>
  );
}
