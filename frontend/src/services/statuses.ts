/**
 * Statuses API service
 */

import { api, buildQueryString } from './api';
import type {
  StatusCreateRequest,
  StatusFull,
  StatusListResponse,
  StatusReorderRequest,
  StatusReorderResponse,
  StatusUpdateRequest,
} from '@/types';

/**
 * Get all statuses
 */
export async function getStatuses(includeInactive = false): Promise<StatusListResponse> {
  const queryString = buildQueryString({ include_inactive: includeInactive });
  return api.get<StatusListResponse>(`/statuses${queryString}`);
}

/**
 * Create a new status
 */
export async function createStatus(data: StatusCreateRequest): Promise<StatusFull> {
  return api.post<StatusFull>('/statuses', data);
}

/**
 * Update a status
 */
export async function updateStatus(id: string, data: StatusUpdateRequest): Promise<StatusFull> {
  return api.patch<StatusFull>(`/statuses/${id}`, data);
}

/**
 * Reorder statuses
 */
export async function reorderStatuses(data: StatusReorderRequest): Promise<StatusReorderResponse> {
  return api.post<StatusReorderResponse>('/statuses/reorder', data);
}

/**
 * Delete a status
 */
export async function deleteStatus(id: string): Promise<void> {
  return api.delete(`/statuses/${id}`);
}
