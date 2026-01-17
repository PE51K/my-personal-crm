/**
 * Kanban hooks with TanStack Query
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moveContact } from '@/services/kanban';
import type { ContactListItem, KanbanMoveRequest, PaginatedResponse } from '@/types';
import { contactKeys } from './useContacts';

/**
 * Hook to move a contact in Kanban (change status/position)
 */
export function useMoveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: KanbanMoveRequest) => moveContact(data),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: contactKeys.lists() });

      // Snapshot previous value for rollback
      const previousContacts = queryClient.getQueriesData<PaginatedResponse<ContactListItem>>({
        queryKey: contactKeys.lists(),
      });

      // Optimistically update the contact's status and position in all cached lists
      queryClient.setQueriesData<PaginatedResponse<ContactListItem>>(
        { queryKey: contactKeys.lists() },
        (old) => {
          if (!old) return old;

          // Find the moved contact and its current status
          const movedContact = old.data.find((c) => c.id === variables.contact_id);
          if (!movedContact) return old;

          const oldStatusId = movedContact.status?.id;
          const newStatusId = variables.status_id;
          const newPosition = variables.position;

          // Check if moving within the same status
          const isSameStatus = oldStatusId === newStatusId;

          // Create a new array with updated contacts
          let updatedData = old.data.map((contact) => {
            // Skip the moved contact for now
            if (contact.id === variables.contact_id) {
              return contact;
            }

            const contactStatusId = contact.status?.id;
            const contactPosition = contact.sort_order_in_status;

            if (contactPosition === undefined) return contact;

            if (isSameStatus && contactStatusId === newStatusId) {
              // Moving within the same status
              const oldPosition = movedContact.sort_order_in_status ?? 0;

              if (oldPosition < newPosition) {
                // Moving down: shift up contacts between old and new position
                if (contactPosition > oldPosition && contactPosition <= newPosition) {
                  return {
                    ...contact,
                    sort_order_in_status: contactPosition - 1,
                  };
                }
              } else {
                // Moving up: shift down contacts between new and old position
                if (contactPosition >= newPosition && contactPosition < oldPosition) {
                  return {
                    ...contact,
                    sort_order_in_status: contactPosition + 1,
                  };
                }
              }
            } else {
              // Moving between different statuses
              if (contactStatusId === oldStatusId) {
                // Shift up contacts in old status to fill the gap
                if (movedContact.sort_order_in_status !== undefined && contactPosition > movedContact.sort_order_in_status) {
                  return {
                    ...contact,
                    sort_order_in_status: contactPosition - 1,
                  };
                }
              } else if (contactStatusId === newStatusId) {
                // Shift down contacts in new status to make room
                if (contactPosition >= newPosition) {
                  return {
                    ...contact,
                    sort_order_in_status: contactPosition + 1,
                  };
                }
              }
            }

            return contact;
          });

          // Update the moved contact with new status and position
          updatedData = updatedData.map((contact) =>
            contact.id === variables.contact_id
              ? {
                  ...contact,
                  status: { id: newStatusId, name: movedContact.status?.name || '' },
                  sort_order_in_status: newPosition,
                }
              : contact
          );

          return {
            ...old,
            data: updatedData,
          };
        }
      );

      return { previousContacts };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousContacts) {
        for (const [queryKey, data] of context.previousContacts) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: () => {
      // Refetch to ensure data consistency with server
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      // Invalidate statuses to update contact counts
      void queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });
}
