/**
 * Contact form component for create/edit
 */

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { Badge } from '@/components/ui/Badge';
import { PhotoUpload } from './PhotoUpload';
import {
  useTagSuggestions,
  useInterestSuggestions,
  useOccupationSuggestions,
  usePositionSuggestions,
  useStatusSuggestions,
  useContactSuggestions,
} from '@/hooks/useSuggestions';
import type {
  Contact,
  ContactAssociationBrief,
  ContactCreateRequest,
  ContactUpdateRequest,
  Tag,
  Interest,
  Occupation,
  Position,
  Status,
  StatusInput,
} from '@/types';

interface ContactFormProps {
  initialData?: Contact | null;
  onSubmit: (data: ContactCreateRequest | ContactUpdateRequest) => Promise<void>;
  onCancel?: () => void;
  onPhotoUpload?: (file: File) => void;
  isSubmitting?: boolean;
  isUploadingPhoto?: boolean;
  submitLabel?: string;
}

interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  telegram_username: string;
  linkedin_url: string;
  github_username: string;
  met_at: string;
  notes: string;
}

interface FormErrors {
  first_name?: string;
  linkedin_url?: string;
  general?: string;
}

export function ContactForm({
  initialData,
  onSubmit,
  onCancel,
  onPhotoUpload,
  isSubmitting = false,
  isUploadingPhoto = false,
  submitLabel = 'Save Contact',
}: ContactFormProps): ReactNode {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    first_name: initialData?.first_name ?? '',
    middle_name: initialData?.middle_name ?? '',
    last_name: initialData?.last_name ?? '',
    telegram_username: initialData?.telegram_username ?? '',
    linkedin_url: initialData?.linkedin_url ?? '',
    github_username: initialData?.github_username ?? '',
    met_at: initialData?.met_at ?? '',
    notes: initialData?.notes ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Selected items for autocomplete fields
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialData?.tags ?? []);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(
    initialData?.interests ?? []
  );
  // Track occupations with their positions nested
  const [occupationsWithPositions, setOccupationsWithPositions] = useState<
    Array<{ occupation: Occupation; positions: Position[] }>
  >(() => {
    // Initialize from initialData: positions are already nested in occupations
    if (initialData?.occupations) {
      return initialData.occupations.map((occ) => ({
        occupation: occ,
        positions: occ.positions,
      }));
    }
    return [];
  });
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(
    initialData?.status ?? null
  );
  const [selectedAssociations, setSelectedAssociations] = useState<ContactAssociationBrief[]>(
    initialData?.associations ?? []
  );

  // Autocomplete queries
  const [tagQuery, setTagQuery] = useState('');
  const [interestQuery, setInterestQuery] = useState('');
  const [occupationQuery, setOccupationQuery] = useState('');
  const [positionQueries, setPositionQueries] = useState<Record<string, string>>({});
  const [statusQuery, setStatusQuery] = useState('');
  const [associationQuery, setAssociationQuery] = useState('');

  // Fetch suggestions
  const { data: tagSuggestions, isLoading: loadingTags } = useTagSuggestions(tagQuery);
  const { data: interestSuggestions, isLoading: loadingInterests } =
    useInterestSuggestions(interestQuery);
  const { data: occupationSuggestions, isLoading: loadingOccupations } =
    useOccupationSuggestions(occupationQuery);
  // For positions, use the first active query or a default query to fetch positions
  // We'll filter client-side by occupation
  const activePositionQuery = Object.values(positionQueries).find((q) => q.trim().length > 0) || 
    (occupationsWithPositions.length > 0 ? ' ' : ''); // Fetch if we have occupations
  const { data: positionSuggestions, isLoading: loadingPositions } =
    usePositionSuggestions(activePositionQuery);
  const { data: statusSuggestions, isLoading: loadingStatuses } =
    useStatusSuggestions(statusQuery);

  // For associations, exclude current contact and already selected ones
  const excludeContactIds = [
    ...(initialData?.id ? [initialData.id] : []),
    ...selectedAssociations.map((a) => a.id),
  ];
  const { data: associationSuggestions, isLoading: loadingAssociations } =
    useContactSuggestions(associationQuery, excludeContactIds);

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.first_name,
        middle_name: initialData.middle_name ?? '',
        last_name: initialData.last_name ?? '',
        telegram_username: initialData.telegram_username ?? '',
        linkedin_url: initialData.linkedin_url ?? '',
        github_username: initialData.github_username ?? '',
        met_at: initialData.met_at ?? '',
        notes: initialData.notes ?? '',
      });
      setSelectedTags(initialData.tags);
      setSelectedInterests(initialData.interests);
      // Group positions by occupation - positions are already nested in occupations
      setOccupationsWithPositions(
        initialData.occupations.map((occ) => ({
          occupation: occ,
          positions: occ.positions,
        }))
      );
      setSelectedStatus(initialData.status);
      setSelectedAssociations(initialData.associations);
    }
  }, [initialData]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (formData.linkedin_url) {
      try {
        new URL(formData.linkedin_url);
      } catch {
        newErrors.linkedin_url = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      // Send status as object if it's a new status (temp ID), otherwise as string ID
      const statusId: string | StatusInput | null = selectedStatus
        ? selectedStatus.id.startsWith('temp-')
          ? { id: selectedStatus.id, name: selectedStatus.name }
          : selectedStatus.id
        : null;

      // Build occupations with nested position_ids
      const occupations = occupationsWithPositions.map((item) => ({
        id: item.occupation.id,
        name: item.occupation.name,
        position_ids: item.positions.map((p) => ({ id: p.id, name: p.name })),
      }));

      const data: ContactCreateRequest | ContactUpdateRequest = {
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        telegram_username: formData.telegram_username.trim() || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        github_username: formData.github_username.trim() || null,
        met_at: formData.met_at || null,
        status_id: statusId,
        notes: formData.notes.trim() || null,
        // Send full objects (with id and name) to support temp IDs
        tag_ids: selectedTags.map((t) => ({ id: t.id, name: t.name })),
        interest_ids: selectedInterests.map((i) => ({ id: i.id, name: i.name })),
        ...(occupations.length > 0 && { occupations }),
        association_contact_ids: selectedAssociations.map((a) => a.id),
      };

      await onSubmit(data);
    },
    [formData, selectedTags, selectedInterests, occupationsWithPositions, selectedAssociations, selectedStatus, onSubmit, validateForm]
  );

  const handleInputChange = useCallback(
    (field: keyof FormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field as keyof FormErrors]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
      },
    [errors]
  );

  // Create new items (for tags, interests, occupations that don't exist)
  const handleCreateTag = useCallback((name: string): void => {
    // Create a temporary ID - server will assign real ID
    const newTag: Tag = { id: `temp-${Date.now()}`, name };
    setSelectedTags((prev) => [...prev, newTag]);
  }, []);

  const handleCreateInterest = useCallback((name: string): void => {
    const newInterest: Interest = { id: `temp-${Date.now()}`, name };
    setSelectedInterests((prev) => [...prev, newInterest]);
  }, []);

  const handleCreateOccupation = useCallback((name: string): void => {
    const newOccupation: Occupation = {
      id: `temp-${Date.now()}`,
      name,
      positions: [],
    };
    setOccupationsWithPositions((prev) => [
      ...prev,
      { occupation: newOccupation, positions: [] },
    ]);
  }, []);

  const handleAddOccupation = useCallback((occupation: Occupation): void => {
    setOccupationsWithPositions((prev) => {
      // Check if already added
      if (prev.some((item) => item.occupation.id === occupation.id)) {
        return prev;
      }
      return [...prev, { occupation, positions: [] }];
    });
  }, []);

  const handleRemoveOccupation = useCallback((occupationId: string): void => {
    setOccupationsWithPositions((prev) =>
      prev.filter((item) => item.occupation.id !== occupationId)
    );
  }, []);

  const handleAddPosition = useCallback(
    (occupationId: string, position: Position): void => {
      setOccupationsWithPositions((prev) =>
        prev.map((item) => {
          if (item.occupation.id === occupationId) {
            // Check if position already exists
            if (item.positions.some((p) => p.id === position.id)) {
              return item;
            }
            return {
              ...item,
              positions: [...item.positions, position],
            };
          }
          return item;
        })
      );
    },
    []
  );

  const handleCreatePosition = useCallback(
    (occupationId: string, name: string): void => {
      const newPosition: Position = {
        id: `temp-${Date.now()}`,
        name,
      };
      handleAddPosition(occupationId, newPosition);
    },
    [handleAddPosition]
  );

  const handleRemovePosition = useCallback(
    (occupationId: string, positionId: string): void => {
      setOccupationsWithPositions((prev) =>
        prev.map((item) => {
          if (item.occupation.id === occupationId) {
            return {
              ...item,
              positions: item.positions.filter((p) => p.id !== positionId),
            };
          }
          return item;
        })
      );
    },
    []
  );

  const handleCreateStatus = useCallback((name: string): void => {
    const newStatus: Status = { id: `temp-${Date.now()}`, name };
    setSelectedStatus(newStatus);
  }, []);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {errors.general}
        </div>
      )}

      {/* Photo upload */}
      <div className="flex justify-center pb-4 border-b border-gray-200">
        <PhotoUpload
          currentPhotoUrl={initialData?.photo_url}
          name={`${formData.first_name} ${formData.last_name}`}
          onUpload={onPhotoUpload}
          isUploading={isUploadingPhoto}
        />
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="First Name"
          value={formData.first_name}
          onChange={handleInputChange('first_name')}
          error={errors.first_name}
          required
        />
        <Input
          label="Middle Name"
          value={formData.middle_name}
          onChange={handleInputChange('middle_name')}
        />
        <Input
          label="Last Name"
          value={formData.last_name}
          onChange={handleInputChange('last_name')}
        />
      </div>

      {/* Social links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Telegram Username"
          value={formData.telegram_username}
          onChange={handleInputChange('telegram_username')}
          placeholder="@username"
        />
        <Input
          label="LinkedIn URL"
          type="url"
          value={formData.linkedin_url}
          onChange={handleInputChange('linkedin_url')}
          error={errors.linkedin_url}
          placeholder="https://linkedin.com/in/..."
        />
        <Input
          label="GitHub Username"
          value={formData.github_username}
          onChange={handleInputChange('github_username')}
          placeholder="username"
        />
      </div>

      {/* Status and date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Autocomplete
          label="Status"
          placeholder="Select or create status..."
          query={statusQuery}
          onQueryChange={setStatusQuery}
          suggestions={statusSuggestions}
          selectedItems={selectedStatus ? [selectedStatus] : []}
          onSelect={(item) => {
            setSelectedStatus(item as Status);
          }}
          onRemove={() => {
            setSelectedStatus(null);
          }}
          onCreate={handleCreateStatus}
          isLoading={loadingStatuses}
          singleSelect
        />
        <Input
          label="Met At"
          type="date"
          value={formData.met_at}
          onChange={handleInputChange('met_at')}
        />
      </div>

      {/* Tags and Interests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Autocomplete
          label="Tags"
          placeholder="Add tags..."
          query={tagQuery}
          onQueryChange={setTagQuery}
          suggestions={tagSuggestions?.data ?? []}
          selectedItems={selectedTags}
          onSelect={(item) => {
            setSelectedTags((prev) => [...prev, item as Tag]);
          }}
          onRemove={(item) => {
            setSelectedTags((prev) => prev.filter((t) => t.id !== item.id));
          }}
          onCreate={handleCreateTag}
          isLoading={loadingTags}
        />
        <Autocomplete
          label="Interests"
          placeholder="Add interests..."
          query={interestQuery}
          onQueryChange={setInterestQuery}
          suggestions={interestSuggestions?.data ?? []}
          selectedItems={selectedInterests}
          onSelect={(item) => {
            setSelectedInterests((prev) => [...prev, item as Interest]);
          }}
          onRemove={(item) => {
            setSelectedInterests((prev) => prev.filter((i) => i.id !== item.id));
          }}
          onCreate={handleCreateInterest}
          isLoading={loadingInterests}
        />
      </div>

      {/* Occupations with Positions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Occupations & Positions
          </label>
        </div>

        {/* Add Occupation */}
        <Autocomplete
          placeholder="Add occupation..."
          query={occupationQuery}
          onQueryChange={setOccupationQuery}
          suggestions={occupationSuggestions?.data ?? []}
          selectedItems={[]}
          onSelect={(item) => {
            handleAddOccupation(item as Occupation);
            setOccupationQuery('');
          }}
          onRemove={() => {}}
          onCreate={handleCreateOccupation}
          isLoading={loadingOccupations}
        />

        {/* Occupations with their positions */}
        {occupationsWithPositions.map(({ occupation, positions }) => {
          const positionQuery = positionQueries[occupation.id] || '';
          const filteredPositionSuggestions = positionSuggestions?.data.filter(
            (pos) => {
              const matchesQuery = positionQuery.trim() === '' || 
                pos.name.toLowerCase().includes(positionQuery.toLowerCase());
              const notAlreadyAdded = !positions.some((p) => p.id === pos.id);
              return matchesQuery && notAlreadyAdded;
            }
          ) ?? [];

          return (
            <div
              key={occupation.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{occupation.name}</span>
                  <Badge variant="primary" size="sm">
                    {positions.length} {positions.length === 1 ? 'position' : 'positions'}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveOccupation(occupation.id);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>

              {/* Positions for this occupation */}
              <div className="space-y-2">
                {positions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {positions.map((position) => (
                      <Badge
                        key={position.id}
                        variant="primary"
                        removable
                        onRemove={() => {
                          handleRemovePosition(occupation.id, position.id);
                        }}
                      >
                        {position.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add position to this occupation */}
                <Autocomplete
                  placeholder={`Add position to ${occupation.name}...`}
                  query={positionQuery}
                  onQueryChange={(query) => {
                    setPositionQueries((prev) => ({
                      ...prev,
                      [occupation.id]: query,
                    }));
                  }}
                  suggestions={filteredPositionSuggestions}
                  selectedItems={[]}
                  onSelect={(item) => {
                    // Convert suggestion item to Position
                    const position: Position = {
                      id: item.id,
                      name: item.name,
                    };
                    handleAddPosition(occupation.id, position);
                    setPositionQueries((prev) => ({
                      ...prev,
                      [occupation.id]: '',
                    }));
                  }}
                  onRemove={() => {}}
                  onCreate={(name) => {
                    handleCreatePosition(occupation.id, name);
                  }}
                  isLoading={loadingPositions}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Associations */}
      <Autocomplete
        label="Associations"
        placeholder="Search contacts to associate..."
        query={associationQuery}
        onQueryChange={setAssociationQuery}
        suggestions={associationSuggestions.map((a) => ({
          id: a.id,
          name: [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' '),
        }))}
        selectedItems={selectedAssociations.map((a) => ({
          id: a.id,
          name: [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' '),
        }))}
        onSelect={(item) => {
          const contact = associationSuggestions.find((a) => a.id === item.id);
          if (contact) {
            setSelectedAssociations((prev) => [...prev, contact]);
          }
        }}
        onRemove={(item) => {
          setSelectedAssociations((prev) => prev.filter((a) => a.id !== item.id));
        }}
        isLoading={loadingAssociations}
        allowCreate={false}
      />

      {/* Notes */}
      <Textarea
        label="Notes"
        value={formData.notes}
        onChange={handleInputChange('notes')}
        rows={4}
        placeholder="Add any notes about this contact..."
      />

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
