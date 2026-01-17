/**
 * Add contact page
 */

import { type ReactNode, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ContactForm } from '@/components/contacts/ContactForm';
import { Button } from '@/components/ui/Button';
import { useCreateContact, useUploadContactPhoto } from '@/hooks/useContacts';
import type { ContactCreateRequest, ContactUpdateRequest } from '@/types';

export function AddContactPage(): ReactNode {
  const navigate = useNavigate();
  const createContact = useCreateContact();
  const uploadPhoto = useUploadContactPhoto();
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  const handlePhotoUpload = useCallback((file: File) => {
    setPendingPhoto(file);
  }, []);

  const handleSubmit = useCallback(
    async (data: ContactCreateRequest | ContactUpdateRequest) => {
      // Create the contact first
      const contact = await createContact.mutateAsync(data as ContactCreateRequest);

      // Upload photo if one was selected
      if (pendingPhoto) {
        await uploadPhoto.mutateAsync({ id: contact.id, file: pendingPhoto });
      }

      navigate('/kanban');
    },
    [createContact, uploadPhoto, pendingPhoto, navigate]
  );

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Contact</h1>
            <p className="mt-2 text-base text-gray-600 opacity-80">
              Create a new contact in your network
            </p>
          </div>
          <Button variant="secondary" onClick={() => { navigate(-1); }}>
            ← Back
          </Button>
        </div>

        <ContactForm
          onSubmit={handleSubmit}
          onCancel={() => { navigate(-1); }}
          onPhotoUpload={handlePhotoUpload}
          isSubmitting={createContact.isPending || uploadPhoto.isPending}
        />
      </div>
    </Layout>
  );
}
