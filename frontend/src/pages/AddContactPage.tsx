/**
 * Add contact page
 */

import { type ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ContactForm } from '@/components/contacts/ContactForm';
import { Button } from '@/components/ui/Button';
import { useCreateContact } from '@/hooks/useContacts';
import type { ContactCreateRequest, ContactUpdateRequest } from '@/types';

export function AddContactPage(): ReactNode {
  const navigate = useNavigate();
  const createContact = useCreateContact();

  const handleSubmit = useCallback(
    async (data: ContactCreateRequest | ContactUpdateRequest) => {
      await createContact.mutateAsync(data as ContactCreateRequest);
      navigate('/kanban');
    },
    [createContact, navigate]
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Contact</h1>
            <p className="mt-2 text-gray-600">
              Create a new contact in your network
            </p>
          </div>
          <Button variant="secondary" onClick={() => { navigate(-1); }}>
            Back
          </Button>
        </div>

        <ContactForm
          onSubmit={handleSubmit}
          onCancel={() => { navigate(-1); }}
          isSubmitting={createContact.isPending}
        />
      </div>
    </Layout>
  );
}
