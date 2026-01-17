/**
 * Contacts hooks with TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContact,
  deleteContact,
  getContact,
  getContactPhotoUrl,
  getContacts,
  updateContact,
  uploadContactPhoto,
} from '@/services/contacts';
import type {
  Contact,
  ContactCreateRequest,
  ContactListItem,
  ContactListParams,
  ContactUpdateRequest,
  PaginatedResponse,
} from '@/types';

/**
 * Query key factory for contacts
 */
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (params?: ContactListParams) => [...contactKeys.lists(), params] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  photoUrl: (id: string) => [...contactKeys.all, 'photo-url', id] as const,
};

/**
 * Hook to fetch paginated contacts list
 */
export function useContacts(params?: ContactListParams) {
  return useQuery({
    queryKey: contactKeys.list(params),
    queryFn: () => getContacts(params),
  });
}

/**
 * Hook to fetch a single contact by ID
 */
export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: contactKeys.detail(id ?? ''),
    queryFn: () => getContact(id ?? ''),
    enabled: !!id,
  });
}

/**
 * Hook to fetch contact photo URL
 */
export function useContactPhotoUrl(id: string | undefined, hasPhoto: boolean) {
  return useQuery({
    queryKey: contactKeys.photoUrl(id ?? ''),
    queryFn: () => getContactPhotoUrl(id ?? ''),
    enabled: !!id && hasPhoto,
    staleTime: 4 * 60 * 1000, // 4 minutes (URL expires in 5)
  });
}

/**
 * Hook to create a contact
 */
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContactCreateRequest) => createContact(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      // Invalidate statuses to update contact counts
      void queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });
}

/**
 * Hook to update a contact
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdateRequest }) =>
      updateContact(id, data),
    onSuccess: (updatedContact) => {
      // Update the specific contact in cache
      queryClient.setQueryData<Contact>(
        contactKeys.detail(updatedContact.id),
        updatedContact
      );
      // Invalidate lists to refresh
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      // Invalidate statuses to update contact counts
      void queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });
}

/**
 * Hook to delete a contact
 */
export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: contactKeys.detail(id) });
      // Invalidate lists
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      // Invalidate statuses to update contact counts
      void queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });
}

/**
 * Hook to upload contact photo
 */
export function useUploadContactPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadContactPhoto(id, file),
    onSuccess: (_data, { id }) => {
      // Invalidate the contact and photo URL
      void queryClient.invalidateQueries({ queryKey: contactKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: contactKeys.photoUrl(id) });
    },
  });
}

/**
 * Helper to extract contacts grouped by status for Kanban
 */
export function groupContactsByStatus(
  contacts: PaginatedResponse<ContactListItem>['data'],
  statusId: string
): ContactListItem[] {
  return contacts.filter((contact) => contact.status?.id === statusId);
}
