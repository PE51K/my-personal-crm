import type { StatusFull } from './contact';
import type { ListResponse } from './api';

/**
 * Status creation request
 */
export interface StatusCreateRequest {
  name: string;
  is_active?: boolean;
}

/**
 * Status update request
 */
export interface StatusUpdateRequest {
  name?: string;
  is_active?: boolean;
}

/**
 * Status reorder request
 */
export interface StatusReorderRequest {
  order: string[];
}

/**
 * Status list response
 */
export type StatusListResponse = ListResponse<StatusFull>;

/**
 * Status reorder response
 */
export interface StatusReorderResponse {
  message: string;
}
