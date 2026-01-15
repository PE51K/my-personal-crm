/**
 * Graph node (contact)
 */
export interface GraphNode {
  id: string;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  cluster_id: number | null;
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
 * Graph cluster
 */
export interface GraphCluster {
  id: number;
  contact_count: number;
  color: string;
}

/**
 * Full graph response
 */
export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
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

/**
 * Cluster recompute response
 */
export interface ClusterRecomputeResponse {
  clusters_found: number;
  contacts_updated: number;
  algorithm: string;
}
