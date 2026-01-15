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
    onSuccess: (updatedStatus) => {
      // Update in cache
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
    onSuccess: () => {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statusKeys.lists() });
    },
  });
}
