/**
 * Statuses hooks with TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStatus,
  deleteStatus,
  getStatuses,
  reorderStatuses,
  updateStatus,
} from '@/services/statuses';
import type {
  StatusCreateRequest,
  StatusFull,
  StatusReorderRequest,
  StatusUpdateRequest,
} from '@/types';

/**
 * Query key factory for statuses
 */
export const statusKeys = {
  all: ['statuses'] as const,
  lists: () => [...statusKeys.all, 'list'] as const,
  list: (includeInactive?: boolean) => [...statusKeys.lists(), { includeInactive }] as const,
};

/**
 * Hook to fetch all statuses
 */
export function useStatuses(includeInactive = false) {
  return useQuery({
    queryKey: statusKeys.list(includeInactive),
    queryFn: () => getStatuses(includeInactive),
    staleTime: 5 * 60 * 1000, // 5 minutes - statuses don't change often
  });
}

/**
 * Hook to get only active statuses
 */
export function useActiveStatuses() {
  const { data, ...rest } = useStatuses(false);

  return {
    ...rest,
    data: data?.data.filter((status) => status.is_active),
  };
}

/**
 * Hook to create a status
 */
export function useCreateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StatusCreateRequest) => createStatus(data),
    onSuccess: () => {
      // Refetch to get the new status with proper ID and order
      void queryClient.invalidateQueries({ queryKey: statusKeys.lists() });
    },
  });
}

/**
 * Hook to update a status
 */
export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StatusUpdateRequest }) =>
      updateStatus(id, data),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: statusKeys.lists() });

      // Snapshot previous value for rollback
      const previousStatuses = queryClient.getQueriesData<{ data: StatusFull[] }>({
        queryKey: statusKeys.lists(),
      });

      // Optimistically update status in cache
      queryClient.setQueriesData<{ data: StatusFull[] }>(
        { queryKey: statusKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            data: old.data.map((s) =>
              s.id === variables.id
                ? { ...s, ...variables.data }
                : s
            ),
          };
        }
      );

      return { previousStatuses };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousStatuses) {
        for (const [queryKey, data] of context.previousStatuses) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: (updatedStatus) => {
      // Update in cache with server response
      queryClient.setQueriesData<{ data: StatusFull[] }>(
        { queryKey: statusKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            data: old.data.map((s) =>
              s.id === updatedStatus.id ? updatedStatus : s
            ),
          };
        }
      );
      
      // Also invalidate to ensure both cache entries are refreshed
      void queryClient.invalidateQueries({ queryKey: statusKeys.lists() });
    },
  });
}

/**
 * Hook to reorder statuses
 */
export function useReorderStatuses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StatusReorderRequest) => reorderStatuses(data),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: statusKeys.lists() });

      // Snapshot previous value for rollback
      const previousStatuses = queryClient.getQueriesData<{ data: StatusFull[] }>({
        queryKey: statusKeys.lists(),
      });

      // Optimistically update status order in cache
      queryClient.setQueriesData<{ data: StatusFull[] }>(
        { queryKey: statusKeys.lists() },
        (old) => {
          if (!old) return old;

          // Create a map for quick lookup
          const statusMap = new Map(old.data.map((s) => [s.id, s]));
          
          // Reorder based on the new order array
          const reorderedData = variables.order
            .map((id, index) => {
              const status = statusMap.get(id);
              return status ? { ...status, sort_order: index } : null;
            })
            .filter((s): s is StatusFull => s !== null);

          return {
            data: reorderedData,
          };
        }
      );

      return { previousStatuses };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousStatuses) {
        for (const [queryKey, data] of context.previousStatuses) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: statusKeys.lists() });
    },
  });
}

/**
 * Hook to delete a status
 */
export function useDeleteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStatus(id),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: statusKeys.lists() });

      // Snapshot previous value for rollback
      const previousStatuses = queryClient.getQueriesData<{ data: StatusFull[] }>({
        queryKey: statusKeys.lists(),
      });

      // Optimistically remove status from cache
      queryClient.setQueriesData<{ data: StatusFull[] }>(
        { queryKey: statusKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            data: old.data.filter((s) => s.id !== variables),
          };
        }
      );

      return { previousStatuses };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousStatuses) {
        for (const [queryKey, data] of context.previousStatuses) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statusKeys.lists() });
    },
  });
}
