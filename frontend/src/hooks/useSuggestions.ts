/**
 * Suggestions hooks with TanStack Query for autocomplete
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInterestSuggestions,
  getOccupationSuggestions,
  getTagSuggestions,
} from '@/services/suggestions';
import { useStatuses } from './useStatuses';

/**
 * Query key factory for suggestions
 */
export const suggestionKeys = {
  all: ['suggestions'] as const,
  tags: (query: string) => [...suggestionKeys.all, 'tags', query] as const,
  interests: (query: string) => [...suggestionKeys.all, 'interests', query] as const,
  occupations: (query: string) => [...suggestionKeys.all, 'occupations', query] as const,
};

/**
 * Hook to fetch tag suggestions
 */
export function useTagSuggestions(query: string, limit = 10) {
  return useQuery({
    queryKey: suggestionKeys.tags(query),
    queryFn: () => getTagSuggestions({ q: query, limit }),
    enabled: query.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch interest suggestions
 */
export function useInterestSuggestions(query: string, limit = 10) {
  return useQuery({
    queryKey: suggestionKeys.interests(query),
    queryFn: () => getInterestSuggestions({ q: query, limit }),
    enabled: query.length >= 1,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch occupation suggestions
 */
export function useOccupationSuggestions(query: string, limit = 10) {
  return useQuery({
    queryKey: suggestionKeys.occupations(query),
    queryFn: () => getOccupationSuggestions({ q: query, limit }),
    enabled: query.length >= 1,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to get filtered status suggestions (client-side filtering)
 */
export function useStatusSuggestions(query: string) {
  const { data: statusesResponse, isLoading } = useStatuses();
  const statuses = statusesResponse?.data ?? [];

  const filteredStatuses = useMemo(() => {
    if (!query.trim()) {
      return statuses.map((s) => ({ id: s.id, name: s.name }));
    }
    const lowerQuery = query.toLowerCase();
    return statuses
      .filter((s) => s.name.toLowerCase().includes(lowerQuery))
      .map((s) => ({ id: s.id, name: s.name }));
  }, [statuses, query]);

  return {
    data: filteredStatuses,
    isLoading,
  };
}
