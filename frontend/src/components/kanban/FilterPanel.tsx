/**
 * Filter panel for contacts page
 */

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Autocomplete } from '@/components/ui/Autocomplete';
import {
  useTagSuggestions,
  useInterestSuggestions,
  useOccupationSuggestions,
  usePositionSuggestions,
  useStatusSuggestions,
} from '@/hooks/useSuggestions';
import type { ContactListParams, Tag, Interest, Occupation, Position, Status } from '@/types';

interface FilterPanelProps {
  filters: ContactListParams;
  onFiltersChange: (filters: ContactListParams) => void;
  showStatusFilter?: boolean; // Only show status filter on contacts page
}

export function FilterPanel({
  filters,
  onFiltersChange,
  showStatusFilter = false,
}: FilterPanelProps): ReactNode {
  const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
  const [metFrom, setMetFrom] = useState(filters.met_at_from ?? '');
  const [metTo, setMetTo] = useState(filters.met_at_to ?? '');

  // Autocomplete queries
  const [tagQuery, setTagQuery] = useState('');
  const [interestQuery, setInterestQuery] = useState('');
  const [occupationQuery, setOccupationQuery] = useState('');
  const [positionQuery, setPositionQuery] = useState('');
  const [statusQuery, setStatusQuery] = useState('');

  // Fetch suggestions
  const { data: tagSuggestions, isLoading: loadingTags } = useTagSuggestions(tagQuery || '', 20);
  const { data: interestSuggestions, isLoading: loadingInterests } = useInterestSuggestions(interestQuery || '', 20);
  const { data: occupationSuggestions, isLoading: loadingOccupations } = useOccupationSuggestions(occupationQuery || '', 20);
  const { data: positionSuggestions, isLoading: loadingPositions } = usePositionSuggestions(positionQuery || '', 20);
  const { data: statusSuggestions, isLoading: loadingStatuses } = useStatusSuggestions(statusQuery || '');

  const selectedTags = useMemo(() => {
    const tagIds = filters.tag_ids ?? [];
    return (tagSuggestions?.data ?? []).filter((tag) => tagIds.includes(tag.id)) as Tag[];
  }, [filters.tag_ids, tagSuggestions?.data]);

  const selectedInterests = useMemo(() => {
    const interestIds = filters.interest_ids ?? [];
    return (interestSuggestions?.data ?? []).filter((interest) => interestIds.includes(interest.id)) as Interest[];
  }, [filters.interest_ids, interestSuggestions?.data]);

  const selectedOccupations = useMemo(() => {
    const occupationIds = filters.occupation_ids ?? [];
    return (occupationSuggestions?.data ?? []).filter((occupation) => occupationIds.includes(occupation.id)) as Occupation[];
  }, [filters.occupation_ids, occupationSuggestions?.data]);

  const selectedPositions = useMemo(() => {
    const positionIds = filters.position_ids ?? [];
    return (positionSuggestions?.data ?? []).filter((position) => positionIds.includes(position.id)) as Position[];
  }, [filters.position_ids, positionSuggestions?.data]);

  const selectedStatuses = useMemo(() => {
    const statusIds = filters.status_ids ?? [];
    return (statusSuggestions ?? []).filter((status) => statusIds.includes(status.id)) as Status[];
  }, [filters.status_ids, statusSuggestions]);

  const handleTagSelect = useCallback(
    (item: Tag) => {
      const newTagIds = [...(filters.tag_ids ?? []), item.id];
      onFiltersChange({ ...filters, tag_ids: newTagIds });
    },
    [filters, onFiltersChange]
  );

  const handleTagRemove = useCallback(
    (item: Tag) => {
      const newTagIds = (filters.tag_ids ?? []).filter((id) => id !== item.id);
      onFiltersChange({ ...filters, tag_ids: newTagIds.length > 0 ? newTagIds : undefined });
    },
    [filters, onFiltersChange]
  );

  const handleInterestSelect = useCallback(
    (item: Interest) => {
      const newInterestIds = [...(filters.interest_ids ?? []), item.id];
      onFiltersChange({ ...filters, interest_ids: newInterestIds });
    },
    [filters, onFiltersChange]
  );

  const handleInterestRemove = useCallback(
    (item: Interest) => {
      const newInterestIds = (filters.interest_ids ?? []).filter((id) => id !== item.id);
      onFiltersChange({ ...filters, interest_ids: newInterestIds.length > 0 ? newInterestIds : undefined });
    },
    [filters, onFiltersChange]
  );

  const handleOccupationSelect = useCallback(
    (item: Occupation) => {
      const newOccupationIds = [...(filters.occupation_ids ?? []), item.id];
      onFiltersChange({ ...filters, occupation_ids: newOccupationIds });
    },
    [filters, onFiltersChange]
  );

  const handleOccupationRemove = useCallback(
    (item: Occupation) => {
      const newOccupationIds = (filters.occupation_ids ?? []).filter((id) => id !== item.id);
      onFiltersChange({ ...filters, occupation_ids: newOccupationIds.length > 0 ? newOccupationIds : undefined });
    },
    [filters, onFiltersChange]
  );

  const handlePositionSelect = useCallback(
    (item: Position) => {
      const newPositionIds = [...(filters.position_ids ?? []), item.id];
      onFiltersChange({ ...filters, position_ids: newPositionIds });
    },
    [filters, onFiltersChange]
  );

  const handlePositionRemove = useCallback(
    (item: Position) => {
      const newPositionIds = (filters.position_ids ?? []).filter((id) => id !== item.id);
      onFiltersChange({ ...filters, position_ids: newPositionIds.length > 0 ? newPositionIds : undefined });
    },
    [filters, onFiltersChange]
  );

  const handleStatusSelect = useCallback(
    (item: Status) => {
      const newStatusIds = [...(filters.status_ids ?? []), item.id];
      onFiltersChange({ ...filters, status_ids: newStatusIds });
    },
    [filters, onFiltersChange]
  );

  const handleStatusRemove = useCallback(
    (item: Status) => {
      const newStatusIds = (filters.status_ids ?? []).filter((id) => id !== item.id);
      onFiltersChange({ ...filters, status_ids: newStatusIds.length > 0 ? newStatusIds : undefined });
    },
    [filters, onFiltersChange]
  );

  const handleApplyFilters = useCallback(() => {
    const newFilters: ContactListParams = {
      ...filters,
    };
    if (searchTerm) newFilters.search = searchTerm;
    else delete newFilters.search;
    if (metFrom) newFilters.met_at_from = metFrom;
    else delete newFilters.met_at_from;
    if (metTo) newFilters.met_at_to = metTo;
    else delete newFilters.met_at_to;
    
    onFiltersChange(newFilters);
  }, [filters, searchTerm, metFrom, metTo, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setMetFrom('');
    setMetTo('');
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters =
    searchTerm ||
    metFrom ||
    metTo ||
    (filters.tag_ids ?? []).length > 0 ||
    (filters.interest_ids ?? []).length > 0 ||
    (filters.occupation_ids ?? []).length > 0 ||
    (filters.position_ids ?? []).length > 0 ||
    (filters.status_ids ?? []).length > 0;

  return (
    <Card className="w-full animate-slide-down">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <Button variant="tertiary" size="sm" onClick={handleClearFilters}>
              Clear All
            </Button>
          )}
        </div>

        {/* Search - in name, middle name, last name */}
        <div>
          <Input
            label="Search"
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); }}
            placeholder="Search in name, middle name, last name..."
          />
        </div>

        {/* Status Filter - only for contacts page */}
        {showStatusFilter && (
          <Autocomplete
            label="Status"
            placeholder="Filter by status..."
            query={statusQuery}
            onQueryChange={setStatusQuery}
            suggestions={statusSuggestions ?? []}
            selectedItems={selectedStatuses}
            onSelect={handleStatusSelect}
            onRemove={handleStatusRemove}
            allowCreate={false}
            isLoading={loadingStatuses}
          />
        )}

        {/* Tags - autocomplete with no create */}
        <Autocomplete
          label="Tags"
          placeholder="Filter by tags..."
          query={tagQuery}
          onQueryChange={setTagQuery}
          suggestions={tagSuggestions?.data ?? []}
          selectedItems={selectedTags}
          onSelect={handleTagSelect}
          onRemove={handleTagRemove}
          allowCreate={false}
          isLoading={loadingTags}
        />

        {/* Interests */}
        <Autocomplete
          label="Interests"
          placeholder="Filter by interests..."
          query={interestQuery}
          onQueryChange={setInterestQuery}
          suggestions={interestSuggestions?.data ?? []}
          selectedItems={selectedInterests}
          onSelect={handleInterestSelect}
          onRemove={handleInterestRemove}
          allowCreate={false}
          isLoading={loadingInterests}
        />

        {/* Occupations */}
        <Autocomplete
          label="Occupations"
          placeholder="Filter by occupations..."
          query={occupationQuery}
          onQueryChange={setOccupationQuery}
          suggestions={occupationSuggestions?.data ?? []}
          selectedItems={selectedOccupations}
          onSelect={handleOccupationSelect}
          onRemove={handleOccupationRemove}
          allowCreate={false}
          isLoading={loadingOccupations}
        />

        {/* Positions */}
        <Autocomplete
          label="Positions"
          placeholder="Filter by positions..."
          query={positionQuery}
          onQueryChange={setPositionQuery}
          suggestions={positionSuggestions?.data ?? []}
          selectedItems={selectedPositions}
          onSelect={handlePositionSelect}
          onRemove={handlePositionRemove}
          allowCreate={false}
          isLoading={loadingPositions}
        />

        {/* Met Date Range */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Date Met Range</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Met From"
              type="date"
              value={metFrom}
              onChange={(e) => { setMetFrom(e.target.value); }}
            />
            <Input
              label="Met To"
              type="date"
              value={metTo}
              onChange={(e) => { setMetTo(e.target.value); }}
            />
          </div>
        </div>

        <Button onClick={handleApplyFilters} className="w-full">
          Apply Filters
        </Button>
      </div>
    </Card>
  );
}
