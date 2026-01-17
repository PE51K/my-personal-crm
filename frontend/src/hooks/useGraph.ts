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
    onSuccess: (newEdge) => {
      // Optimistically add edge to graph (with deduplication)
      queryClient.setQueryData<GraphResponse>(graphKeys.data(), (old) => {
        if (!old) return old;

        // Check if edge already exists (by ID or by source/target pair)
        const edgeExists = old.edges.some(
          (edge) =>
            edge.id === newEdge.id ||
            (edge.source_id === newEdge.source_id && edge.target_id === newEdge.target_id) ||
            (edge.source_id === newEdge.target_id && edge.target_id === newEdge.source_id)
        );

        if (edgeExists) {
          return old; // Don't add duplicate
        }

        return {
          ...old,
          edges: [
            ...old.edges,
            {
              id: newEdge.id,
              source_id: newEdge.source_id,
              target_id: newEdge.target_id,
              label: newEdge.label,
            },
          ],
        };
      });
      // Invalidate contacts as associations may have changed
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
    onSuccess: (_data, deletedId) => {
      // Remove edge from cache
      queryClient.setQueryData<GraphResponse>(graphKeys.data(), (old) => {
        if (!old) return old;
        return {
          ...old,
          edges: old.edges.filter((edge) => edge.id !== deletedId),
        };
      });
      // Invalidate contacts
      void queryClient.invalidateQueries({ queryKey: contactKeys.details() });
    },
  });
}
