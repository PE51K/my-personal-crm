/**
 * Base tag
 */
export interface Tag {
  id: string;
  name: string;
}

/**
 * Tag with usage count
 */
export interface TagWithCount extends Tag {
  usage_count: number;
}

/**
 * Base interest
 */
export interface Interest {
  id: string;
  name: string;
}

/**
 * Base occupation
 */
export interface Occupation {
  id: string;
  name: string;
  positions: Position[];
}

/**
 * Base position
 */
export interface Position {
  id: string;
  name: string;
}

/**
 * Base status
 */
export interface Status {
  id: string;
  name: string;
}

/**
 * Status with full details
 */
export interface StatusFull extends Status {
  sort_order: number;
  is_active: boolean;
  contact_count: number;
}

/**
 * Brief contact info for associations
 */
export interface ContactAssociationBrief {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string | null;
}

/**
 * Input for tag/interest/occupation (supports temp IDs)
 */
export interface TagInput {
  id: string;
  name: string;
}

export interface InterestInput {
  id: string;
  name: string;
}

export interface OccupationInput {
  id: string;
  name: string;
}

export interface PositionInput {
  id: string;
  name: string;
}

export interface OccupationWithPositionsInput {
  id: string;
  name: string;
  position_ids: (string | PositionInput)[];
}

export interface StatusInput {
  id: string;
  name: string;
}

/**
 * Contact creation request
 */
export interface ContactCreateRequest {
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  telegram_username?: string | null;
  linkedin_url?: string | null;
  github_username?: string | null;
  met_at?: string | null; // ISO date string
  status_id?: string | StatusInput | null;
  notes?: string | null;
  tag_ids?: (string | TagInput)[];
  interest_ids?: (string | InterestInput)[];
  occupations?: OccupationWithPositionsInput[];
  association_contact_ids?: string[];
}

/**
 * Contact update request (partial)
 */
export interface ContactUpdateRequest {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  telegram_username?: string | null;
  linkedin_url?: string | null;
  github_username?: string | null;
  met_at?: string | null;
  status_id?: string | StatusInput | null;
  notes?: string | null;
  tag_ids?: (string | TagInput)[];
  interest_ids?: (string | InterestInput)[];
  occupations?: OccupationWithPositionsInput[];
  association_contact_ids?: string[];
}

/**
 * Full contact response
 */
export interface Contact {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  telegram_username: string | null;
  linkedin_url: string | null;
  github_username: string | null;
  met_at: string | null;
  status_id: string | null;
  status: Status | null;
  notes: string | null;
  photo_path: string | null;
  photo_url: string | null;
  tags: Tag[];
  interests: Interest[];
  occupations: Occupation[];
  associations: ContactAssociationBrief[];
  sort_order_in_status: number;
  created_at: string;
  updated_at: string;
}

/**
 * Contact list item (abbreviated)
 */
export interface ContactListItem {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  status: Status | null;
  photo_url: string | null;
  tags: Tag[];
  created_at: string;
  sort_order_in_status?: number;
}

/**
 * Photo upload response
 */
export interface PhotoUploadResponse {
  photo_path: string;
  photo_url: string;
}

/**
 * Photo URL response
 */
export interface PhotoUrlResponse {
  photo_url: string;
  expires_at: string;
}

/**
 * Contact list query parameters
 */
export interface ContactListParams {
  page?: number;
  page_size?: number;
  status_id?: string;
  status_ids?: string[];
  tag_ids?: string[];
  interest_ids?: string[];
  occupation_ids?: string[];
  position_ids?: string[];
  met_at_from?: string;
  met_at_to?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
