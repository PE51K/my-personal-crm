/**
 * Graph hooks with TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEdge,
  deleteEdge,
  getGraph,
} from '@/services/graph';
import type {
  EdgeCreateRequest,
  GraphResponse,
} from '@/types';
import { contactKeys } from './useContacts';

/**
 * Query key factory for graph
 */
export const graphKeys = {
  all: ['graph'] as const,
  data: () => [...graphKeys.all, 'data'] as const,
};

/**
 * Hook to fetch full graph data
 */
export function useGraph() {
  return useQuery({
    queryKey: graphKeys.data(),
    queryFn: getGraph,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to create an edge (association)
 */
export function useCreateEdge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EdgeCreateRequest) => createEdge(data),
    onSuccess: () => {
      // Invalidate and refetch graph data to ensure clean state
      void queryClient.invalidateQueries({ queryKey: graphKeys.data() });
      void queryClient.invalidateQueries({ queryKey: contactKeys.details() });
    },
  });
}

/**
 * Hook to delete an edge
 */
export function useDeleteEdge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEdge(id),
    onSuccess: () => {
      // Invalidate and refetch graph data to ensure clean state
      void queryClient.invalidateQueries({ queryKey: graphKeys.data() });
      void queryClient.invalidateQueries({ queryKey: contactKeys.details() });
    },
  });
}
