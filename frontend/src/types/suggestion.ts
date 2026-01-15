import type { ListResponse } from './api';

/**
 * Suggestion item
 */
export interface SuggestionItem {
  id: string;
  name: string;
  usage_count: number;
}

/**
 * Suggestion list response
 */
export type SuggestionListResponse = ListResponse<SuggestionItem>;

/**
 * Suggestion query parameters
 */
export interface SuggestionParams {
  q: string;
  limit?: number;
}
