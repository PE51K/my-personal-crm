/**
 * Graph API service
 */

import { api, buildQueryString } from './api';
import type {
  EdgeCreateRequest,
  EdgeResponse,
  GraphResponse,
  ContactListParams,
} from '@/types';

/**
 * Get full graph data (nodes, edges) with optional filters
 */
export async function getGraph(filters?: Partial<ContactListParams>): Promise<GraphResponse> {
  const queryParams: Record<string, string> = {};
  
  if (filters?.status_id) queryParams.status_id = filters.status_id;
  if (filters?.status_ids) queryParams.status_ids = filters.status_ids.join(',');
  if (filters?.tag_ids) queryParams.tag_ids = filters.tag_ids.join(',');
  if (filters?.interest_ids) queryParams.interest_ids = filters.interest_ids.join(',');
  if (filters?.occupation_ids) queryParams.occupation_ids = filters.occupation_ids.join(',');
  if (filters?.position_ids) queryParams.position_ids = filters.position_ids.join(',');
  if (filters?.met_at_from) queryParams.met_at_from = filters.met_at_from;
  if (filters?.met_at_to) queryParams.met_at_to = filters.met_at_to;
  if (filters?.search) queryParams.search = filters.search;

  const queryString = buildQueryString(queryParams);
  return api.get<GraphResponse>(`/graph${queryString}`);
}

/**
 * Create a new edge (association) between contacts
 */
export async function createEdge(data: EdgeCreateRequest): Promise<EdgeResponse> {
  return api.post<EdgeResponse>('/graph/edge', data);
}

/**
 * Delete an edge
 */
export async function deleteEdge(id: string): Promise<undefined> {
  return api.delete<undefined>(`/graph/edge/${id}`);
}
