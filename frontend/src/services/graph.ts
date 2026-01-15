/**
 * Graph API service
 */

import { api } from './api';
import type {
  EdgeCreateRequest,
  EdgeResponse,
  GraphResponse,
} from '@/types';

/**
 * Get full graph data (nodes, edges)
 */
export async function getGraph(): Promise<GraphResponse> {
  return api.get<GraphResponse>('/graph');
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
