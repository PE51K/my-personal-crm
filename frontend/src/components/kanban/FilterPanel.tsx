/**
 * Filter panel for Kanban board
 */

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useTagSuggestions,
  useInterestSuggestions,
  useOccupationSuggestions,
} from '@/hooks/useSuggestions';
import type { ContactListParams } from '@/types';

interface FilterPanelProps {
  filters: ContactListParams;
  onFiltersChange: (filters: ContactListParams) => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
}: FilterPanelProps): ReactNode {
  const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
  const [createdFrom, setCreatedFrom] = useState(filters.created_at_from ?? '');
  const [createdTo, setCreatedTo] = useState(filters.created_at_to ?? '');
  const [metFrom, setMetFrom] = useState(filters.met_at_from ?? '');
  const [metTo, setMetTo] = useState(filters.met_at_to ?? '');

  const { data: tagsData } = useTagSuggestions('', 20);
  const { data: interestsData } = useInterestSuggestions('', 20);
  const { data: occupationsData } = useOccupationSuggestions('', 20);

  const tags = tagsData?.data ?? [];
  const interests = interestsData?.data ?? [];
  const occupations = occupationsData?.data ?? [];

  const selectedTags = useMemo(() => filters.tag_ids ?? [], [filters.tag_ids]);
  const selectedInterests = useMemo(() => filters.interest_ids ?? [], [filters.interest_ids]);
  const selectedOccupations = useMemo(() => filters.occupation_ids ?? [], [filters.occupation_ids]);

  const handleToggleTag = useCallback(
    (tagId: string) => {
      const newTags = selectedTags.includes(tagId)
        ? selectedTags.filter((id) => id !== tagId)
        : [...selectedTags, tagId];
      onFiltersChange({ ...filters, tag_ids: newTags });
    },
    [selectedTags, filters, onFiltersChange]
  );

  const handleToggleInterest = useCallback(
    (interestId: string) => {
      const newInterests = selectedInterests.includes(interestId)
        ? selectedInterests.filter((id) => id !== interestId)
        : [...selectedInterests, interestId];
      onFiltersChange({ ...filters, interest_ids: newInterests });
    },
    [selectedInterests, filters, onFiltersChange]
  );

  const handleToggleOccupation = useCallback(
    (occupationId: string) => {
      const newOccupations = selectedOccupations.includes(occupationId)
        ? selectedOccupations.filter((id) => id !== occupationId)
        : [...selectedOccupations, occupationId];
      onFiltersChange({ ...filters, occupation_ids: newOccupations });
    },
    [selectedOccupations, filters, onFiltersChange]
  );

  const handleApplyFilters = useCallback(() => {
    const newFilters: ContactListParams = {
      ...filters,
    };
    if (searchTerm) newFilters.search = searchTerm;
    if (createdFrom) newFilters.created_at_from = createdFrom;
    if (createdTo) newFilters.created_at_to = createdTo;
    if (metFrom) newFilters.met_at_from = metFrom;
    if (metTo) newFilters.met_at_to = metTo;
    
    onFiltersChange(newFilters);
  }, [filters, searchTerm, createdFrom, createdTo, metFrom, metTo, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setCreatedFrom('');
    setCreatedTo('');
    setMetFrom('');
    setMetTo('');
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters =
    searchTerm ||
    createdFrom ||
    createdTo ||
    metFrom ||
    metTo ||
    selectedTags.length > 0 ||
    selectedInterests.length > 0 ||
    selectedOccupations.length > 0;

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

        {/* Search */}
        <div>
          <Input
            label="Search"
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); }}
            placeholder="Search contacts..."
          />
        </div>

        {/* Date Ranges */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Date Range</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Created From"
              type="date"
              value={createdFrom}
              onChange={(e) => { setCreatedFrom(e.target.value); }}
            />
            <Input
              label="Created To"
              type="date"
              value={createdTo}
              onChange={(e) => { setCreatedTo(e.target.value); }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Met Date Range</h4>
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

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 10).map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? 'primary' : 'default'}
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => { handleToggleTag(tag.id); }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Interests
            </label>
            <div className="flex flex-wrap gap-2">
              {interests.slice(0, 10).map((interest) => (
                <Badge
                  key={interest.id}
                  variant={
                    selectedInterests.includes(interest.id) ? 'primary' : 'default'
                  }
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => { handleToggleInterest(interest.id); }}
                >
                  {interest.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Occupations */}
        {occupations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Occupations
            </label>
            <div className="flex flex-wrap gap-2">
              {occupations.slice(0, 10).map((occupation) => (
                <Badge
                  key={occupation.id}
                  variant={
                    selectedOccupations.includes(occupation.id)
                      ? 'primary'
                      : 'default'
                  }
                  className="cursor-pointer transition-all duration-150"
                  onClick={() => { handleToggleOccupation(occupation.id); }}
                >
                  {occupation.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleApplyFilters} className="w-full">
          Apply Filters
        </Button>
      </div>
    </Card>
  );
}
