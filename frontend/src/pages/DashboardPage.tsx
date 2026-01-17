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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-base text-gray-600 opacity-80">
            Welcome to your Personal CRM
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card shadow="sm">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Contacts</h3>
              <p className="mt-3 text-4xl font-bold text-gray-900 font-tabular">
                {isLoading ? '...' : totalContacts}
              </p>
            </div>
          </Card>

          <Link to="/contacts/add">
            <Card interactive shadow="sm" className="h-full bg-gradient-to-br from-primary-50 to-white border-primary-200">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-primary-900 uppercase tracking-wide">Add Contact</h3>
                <div className="mt-3 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/kanban">
            <Card interactive shadow="sm" className="h-full">
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">View Kanban</h3>
                <p className="mt-3 text-xl font-semibold text-gray-700">Organize Contacts</p>
              </div>
            </Card>
          </Link>
        </div>

        <Card shadow="sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/contacts/add">
              <Button leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }>
                Add New Contact
              </Button>
            </Link>
            <Link to="/kanban">
              <Button variant="secondary" leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              }>
                View Kanban Board
              </Button>
            </Link>
            <Link to="/graph">
              <Button variant="secondary" leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }>
                View Network Graph
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
