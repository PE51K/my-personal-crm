/**
 * Suggestions API service for autocomplete
 */

import { api, buildQueryString } from './api';
import type { SuggestionListResponse, SuggestionParams } from '@/types';

/**
 * Get tag suggestions
 */
export async function getTagSuggestions(params: SuggestionParams): Promise<SuggestionListResponse> {
  const queryString = buildQueryString({ q: params.q, limit: params.limit });
  return api.get<SuggestionListResponse>(`/suggestions/tags${queryString}`);
}

/**
 * Get interest suggestions
 */
export async function getInterestSuggestions(
  params: SuggestionParams
): Promise<SuggestionListResponse> {
  const queryString = buildQueryString({ q: params.q, limit: params.limit });
  return api.get<SuggestionListResponse>(`/suggestions/interests${queryString}`);
}

/**
 * Get occupation suggestions
 */
export async function getOccupationSuggestions(
  params: SuggestionParams
): Promise<SuggestionListResponse> {
  const queryString = buildQueryString({ q: params.q, limit: params.limit });
  return api.get<SuggestionListResponse>(`/suggestions/occupations${queryString}`);
}

/**
 * Get position suggestions
 */
export async function getPositionSuggestions(
  params: SuggestionParams
): Promise<SuggestionListResponse> {
  const queryString = buildQueryString({ q: params.q, limit: params.limit });
  return api.get<SuggestionListResponse>(`/suggestions/positions${queryString}`);
}
