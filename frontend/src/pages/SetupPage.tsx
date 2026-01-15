/**
 * Setup page for bootstrapping the application with owner account
 */

import type { ReactNode } from 'react';
import { SetupOwnerForm } from '@/components/auth/SetupOwnerForm';

export function SetupPage(): ReactNode {
  return <SetupOwnerForm />;
}
