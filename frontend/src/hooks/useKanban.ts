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

      // Optimistically update the contact's status in all cached lists
      queryClient.setQueriesData<PaginatedResponse<ContactListItem>>(
        { queryKey: contactKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((contact) =>
              contact.id === variables.contact_id
                ? {
                    ...contact,
                    status: { id: variables.status_id, name: '' }, // Name will be corrected on refetch
                  }
                : contact
            ),
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
    onSettled: () => {
      // Always refetch after error or success
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}
