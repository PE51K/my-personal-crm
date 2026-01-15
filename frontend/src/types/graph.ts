/**
 * Graph node (contact)
 */
export interface GraphNode {
  id: string;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  position_x: number | null;
  position_y: number | null;
}

/**
 * Graph edge (association)
 */
export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  label: string | null;
}

/**
 * Full graph response
 */
export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Edge creation request
 */
export interface EdgeCreateRequest {
  source_id: string;
  target_id: string;
  label?: string | null;
}

/**
 * Edge response
 */
export interface EdgeResponse {
  id: string;
  source_id: string;
  target_id: string;
  label: string | null;
  created_at: string;
}
