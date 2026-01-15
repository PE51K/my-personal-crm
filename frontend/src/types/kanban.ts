/**
 * Kanban move request
 */
export interface KanbanMoveRequest {
  contact_id: string;
  status_id: string;
  position: number;
}

/**
 * Kanban move response
 */
export interface KanbanMoveResponse {
  id: string;
  status_id: string;
  sort_order_in_status: number;
}
