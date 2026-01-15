/**
 * PersonCard modal for viewing/editing contact details
 */

import { useCallback, useState, type ReactNode } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ContactForm } from './ContactForm';
import { useContact, useUpdateContact, useDeleteContact, useUploadContactPhoto } from '@/hooks/useContacts';
import { LoadingScreen } from '@/components/ui/Spinner';
import { ApiClientError } from '@/services/api';
import type { ContactUpdateRequest } from '@/types';

interface PersonCardProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function PersonCard({
  contactId,
  isOpen,
  onClose,
  onDeleted,
}: PersonCardProps): ReactNode {
  const { data: contact, isLoading, error } = useContact(contactId);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const uploadPhoto = useUploadContactPhoto();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (data: ContactUpdateRequest): Promise<void> => {
      try {
        setSubmitError(null);
        await updateContact.mutateAsync({ id: contactId, data });
        setIsEditing(false);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setSubmitError(err.message);
        } else {
          setSubmitError('An unexpected error occurred');
        }
        throw err;
      }
    },
    [contactId, updateContact]
  );

  const handlePhotoUpload = useCallback(
    (file: File): void => {
      void uploadPhoto.mutateAsync({ id: contactId, file });
    },
    [contactId, uploadPhoto]
  );

  const handleDelete = useCallback(async (): Promise<void> => {
    try {
      await deleteContact.mutateAsync(contactId);
      onClose();
      onDeleted?.();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to delete contact');
      }
    }
  }, [contactId, deleteContact, onClose, onDeleted]);

  const handleClose = useCallback((): void => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSubmitError(null);
    onClose();
  }, [onClose]);

  // Loading state
  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Loading...">
        <div className="py-8">
          <LoadingScreen />
        </div>
      </Modal>
    );
  }

  // Error state
  if (error ?? !contact) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Error">
        <div className="py-8 text-center">
          <p className="text-red-600">
            {error instanceof ApiClientError ? error.message : 'Contact not found'}
          </p>
          <Button variant="secondary" onClick={handleClose} className="mt-4">
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  const fullName = [contact.first_name, contact.middle_name, contact.last_name]
    .filter(Boolean)
    .join(' ');

  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => { setShowDeleteConfirm(false); }} title="Delete Contact">
        <div className="py-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be
            undone.
          </p>
          {submitError && (
            <p className="mt-4 text-sm text-red-600">{submitError}</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowDeleteConfirm(false); }}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleDelete()}
            isLoading={deleteContact.isPending}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  // Edit mode
  if (isEditing) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={`Edit ${fullName}`} size="lg">
        {submitError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {submitError}
          </div>
        )}
        <ContactForm
          initialData={contact}
          onSubmit={handleSave}
          onCancel={() => { setIsEditing(false); }}
          onPhotoUpload={handlePhotoUpload}
          isSubmitting={updateContact.isPending}
          isUploadingPhoto={uploadPhoto.isPending}
          submitLabel="Save Changes"
        />
      </Modal>
    );
  }

  // View mode
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={fullName} size="lg">
      <div className="space-y-6">
        {/* Header with photo and basic info */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
            >
              {contact.photo_url ? (
                <img
                  src={contact.photo_url}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-gray-500">
                  {contact.first_name.charAt(0)}
                  {contact.last_name?.charAt(0) ?? ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{fullName}</h2>
            {contact.status && (
              <span className="inline-block mt-1 px-2 py-0.5 text-sm bg-primary-100 text-primary-800 rounded">
                {contact.status.name}
              </span>
            )}
            {contact.met_at && (
              <p className="mt-2 text-sm text-gray-500">
                Met on {new Date(contact.met_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Social links */}
        {(contact.telegram_username ?? contact.linkedin_url ?? contact.github_username) && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Social Links</h3>
            <div className="space-y-1">
              {contact.telegram_username && (
                <p className="text-sm text-gray-600">
                  Telegram:{' '}
                  <a
                    href={`https://t.me/${contact.telegram_username.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {contact.telegram_username}
                  </a>
                </p>
              )}
              {contact.linkedin_url && (
                <p className="text-sm text-gray-600">
                  LinkedIn:{' '}
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    Profile
                  </a>
                </p>
              )}
              {contact.github_username && (
                <p className="text-sm text-gray-600">
                  GitHub:{' '}
                  <a
                    href={`https://github.com/${contact.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {contact.github_username}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tags, Interests, Occupations */}
        {(contact.tags.length > 0 ||
          contact.interests.length > 0 ||
          contact.occupations.length > 0) && (
          <div className="border-t border-gray-200 pt-4">
            {contact.tags.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 mb-1">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {contact.interests.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 mb-1">Interests</h3>
                <div className="flex flex-wrap gap-1">
                  {contact.interests.map((interest) => (
                    <span
                      key={interest.id}
                      className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full"
                    >
                      {interest.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {contact.occupations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Occupations</h3>
                <div className="flex flex-wrap gap-1">
                  {contact.occupations.map((occupation) => (
                    <span
                      key={occupation.id}
                      className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                    >
                      {occupation.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        {/* Associations */}
        {contact.associations.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Associations</h3>
            <div className="space-y-1">
              {contact.associations.map((assoc) => (
                <p key={assoc.id} className="text-sm text-gray-600">
                  {assoc.first_name} {assoc.last_name}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="danger" onClick={() => { setShowDeleteConfirm(true); }}>
          Delete
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        <Button onClick={() => { setIsEditing(true); }}>Edit</Button>
      </ModalFooter>
    </Modal>
  );
}
