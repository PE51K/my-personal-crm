/**
 * Contacts API service
 */

import { api, buildQueryString } from './api';
import type {
  Contact,
  ContactCreateRequest,
  ContactListItem,
  ContactListParams,
  ContactUpdateRequest,
  PaginatedResponse,
  PhotoUploadResponse,
  PhotoUrlResponse,
} from '@/types';

/**
 * Create a new contact
 */
export async function createContact(data: ContactCreateRequest): Promise<Contact> {
  return api.post<Contact>('/contacts', data);
}

/**
 * Get paginated list of contacts with optional filters
 */
export async function getContacts(
  params?: ContactListParams
): Promise<PaginatedResponse<ContactListItem>> {
  const queryString = params
    ? buildQueryString({
        page: params.page,
        page_size: params.page_size,
        status_id: params.status_id,
        tag_ids: params.tag_ids,
        interest_ids: params.interest_ids,
        occupation_ids: params.occupation_ids,
        created_at_from: params.created_at_from,
        created_at_to: params.created_at_to,
        met_at_from: params.met_at_from,
        met_at_to: params.met_at_to,
        search: params.search,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      })
    : '';

  return api.get<PaginatedResponse<ContactListItem>>(`/contacts${queryString}`);
}

/**
 * Get a single contact by ID
 */
export async function getContact(id: string): Promise<Contact> {
  return api.get<Contact>(`/contacts/${id}`);
}

/**
 * Update a contact (partial update)
 */
export async function updateContact(id: string, data: ContactUpdateRequest): Promise<Contact> {
  return api.patch<Contact>(`/contacts/${id}`, data);
}

/**
 * Delete a contact
 */
export async function deleteContact(id: string): Promise<undefined> {
  return api.delete<undefined>(`/contacts/${id}`);
}

/**
 * Upload a contact photo
 */
export async function uploadContactPhoto(id: string, file: File): Promise<PhotoUploadResponse> {
  return api.upload<PhotoUploadResponse>(`/contacts/${id}/photo`, file, 'photo');
}

/**
 * Get signed URL for contact photo
 */
export async function getContactPhotoUrl(id: string): Promise<PhotoUrlResponse> {
  return api.get<PhotoUrlResponse>(`/contacts/${id}/photo-url`);
}
