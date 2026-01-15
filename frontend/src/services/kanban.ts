/**
 * Kanban API service
 */

import { api } from './api';
import type { KanbanMoveRequest, KanbanMoveResponse } from '@/types';

/**
 * Move a contact to a different status and/or position
 */
export async function moveContact(data: KanbanMoveRequest): Promise<KanbanMoveResponse> {
  return api.post<KanbanMoveResponse>('/kanban/move', data);
}
