/**
 * Dashboard page - main landing page after login
 */

import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useContacts } from '@/hooks/useContacts';

export function DashboardPage(): ReactNode {
  const { data: contactsData, isLoading } = useContacts({});

  const totalContacts = contactsData?.pagination.total_items ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to your Personal CRM
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-500">Total Contacts</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {isLoading ? '...' : totalContacts}
              </p>
            </div>
          </Card>

          <Link to="/contacts/add">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500">Add Contact</h3>
                <p className="mt-2 text-3xl font-bold text-blue-600">+</p>
              </div>
            </Card>
          </Link>

          <Link to="/kanban">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500">View Kanban</h3>
                <p className="mt-2 text-lg font-medium text-gray-700">Organize</p>
              </div>
            </Card>
          </Link>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/contacts/add">
              <Button>Add New Contact</Button>
            </Link>
            <Link to="/kanban">
              <Button variant="secondary">View Kanban Board</Button>
            </Link>
            <Link to="/graph">
              <Button variant="secondary">View Network Graph</Button>
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
