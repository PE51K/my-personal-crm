/**
 * Status Management component for CRUD operations on statuses
 */

import { type ReactNode, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useStatuses,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
  useReorderStatuses,
} from '@/hooks';
import type { StatusFull } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

interface StatusManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SortableStatusItemProps {
  status: StatusFull;
  onEdit: (status: StatusFull) => void;
  onDelete: (status: StatusFull) => void;
  onToggleActive: (status: StatusFull) => void;
}

function SortableStatusItem({
  status,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableStatusItemProps): ReactNode {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </button>

      {/* Status Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{status.name}</span>
          {!status.is_active && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              Inactive
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {status.contact_count} contact{status.contact_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { onToggleActive(status); }}
          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
          title={status.is_active ? 'Deactivate' : 'Activate'}
        >
          {status.is_active ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => { onEdit(status); }}
          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
          title="Edit name"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => { onDelete(status); }}
          disabled={status.contact_count > 0}
          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title={
            status.contact_count > 0
              ? 'Cannot delete: status is in use'
              : 'Delete status'
          }
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function StatusManagement({
  isOpen,
  onClose,
}: StatusManagementProps): ReactNode {
  const [localStatuses, setLocalStatuses] = useState<StatusFull[]>([]);
  const [editingStatus, setEditingStatus] = useState<StatusFull | null>(null);
  const [editName, setEditName] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [showNewStatusForm, setShowNewStatusForm] = useState(false);

  const { data: statusesData, isLoading } = useStatuses(true);
  const createMutation = useCreateStatus();
  const updateMutation = useUpdateStatus();
  const deleteMutation = useDeleteStatus();
  const reorderMutation = useReorderStatuses();

  const statuses = statusesData?.data ?? [];

  // Sync local state with fetched data whenever it changes
  useEffect(() => {
    if (statuses.length > 0) {
      setLocalStatuses(statuses);
    }
  }, [statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localStatuses.findIndex((s) => s.id === active.id);
      const newIndex = localStatuses.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(localStatuses, oldIndex, newIndex);
      setLocalStatuses(reordered);

      // Save new order to backend
      void reorderMutation.mutateAsync({
        order: reordered.map((s) => s.id),
      });
    }
  };

  const handleEdit = (status: StatusFull): void => {
    setEditingStatus(status);
    setEditName(status.name);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingStatus || !editName.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: editingStatus.id,
        data: { name: editName.trim() },
      });
      setEditingStatus(null);
      setEditName('');
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleToggleActive = async (status: StatusFull): Promise<void> => {
    try {
      await updateMutation.mutateAsync({
        id: status.id,
        data: { is_active: !status.is_active },
      });
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleDelete = async (status: StatusFull): Promise<void> => {
    if (status.contact_count > 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete the status "${status.name}"?`
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(status.id);
      setLocalStatuses((prev) => prev.filter((s) => s.id !== status.id));
    } catch (error) {
      console.error('Failed to delete status:', error);
      alert('Failed to delete status. Please try again.');
    }
  };

  const handleCreateStatus = async (): Promise<void> => {
    if (!newStatusName.trim()) return;

    try {
      await createMutation.mutateAsync({
        name: newStatusName.trim(),
        is_active: true,
      });
      setNewStatusName('');
      setShowNewStatusForm(false);
    } catch (error) {
      console.error('Failed to create status:', error);
      alert('Failed to create status. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Statuses" size="lg">
      <div className="space-y-4">
        {/* Instructions */}
        <p className="text-sm text-gray-600">
          Manage your Kanban board columns. Drag to reorder, click icons to edit, toggle
          visibility, or delete.
        </p>

        {/* Status List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localStatuses.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localStatuses.map((status) => (
                  <SortableStatusItem
                    key={status.id}
                    status={status}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* New Status Form */}
        {showNewStatusForm ? (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <Input
              label="Status Name"
              value={newStatusName}
              onChange={(e) => { setNewStatusName(e.target.value); }}
              placeholder="Enter status name"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleCreateStatus();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => { void handleCreateStatus(); }}
                disabled={!newStatusName.trim() || createMutation.isPending}
                isLoading={createMutation.isPending}
              >
                Create
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowNewStatusForm(false);
                  setNewStatusName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setShowNewStatusForm(true); }}
            leftIcon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
          >
            Add New Status
          </Button>
        )}
      </div>

      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </ModalFooter>

      {/* Edit Modal */}
      {editingStatus && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEditingStatus(null);
            setEditName('');
          }}
          title="Edit Status Name"
          size="sm"
        >
          <div className="space-y-4">
            <Input
              label="Status Name"
              value={editName}
              onChange={(e) => { setEditName(e.target.value); }}
              placeholder="Enter status name"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSaveEdit();
                }
              }}
            />
          </div>

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingStatus(null);
                setEditName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => { void handleSaveEdit(); }}
              disabled={!editName.trim() || updateMutation.isPending}
              isLoading={updateMutation.isPending}
            >
              Save
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </Modal>
  );
}
