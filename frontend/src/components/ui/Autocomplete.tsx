/**
 * Autocomplete input component for suggestions
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Input } from './Input';
import { Badge } from './Badge';
import { Spinner } from './Spinner';

interface AutocompleteItem {
  id: string;
  name: string;
}

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  suggestions: AutocompleteItem[];
  selectedItems: AutocompleteItem[];
  onQueryChange: (query: string) => void;
  onSelect: (item: AutocompleteItem) => void;
  onRemove: (item: AutocompleteItem) => void;
  onCreate?: (name: string) => void;
  isLoading?: boolean;
  allowCreate?: boolean;
  query: string;
  /** Single select mode - only one item can be selected at a time */
  singleSelect?: boolean;
}

export function Autocomplete({
  label,
  placeholder,
  error,
  helperText,
  suggestions,
  selectedItems,
  onQueryChange,
  onSelect,
  onRemove,
  onCreate,
  isLoading = false,
  allowCreate = true,
  query,
  singleSelect = false,
}: AutocompleteProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out already selected items
  const filteredSuggestions = suggestions.filter(
    (s) => !selectedItems.some((item) => item.id === s.id)
  );

  // Check if we can create a new item
  const canCreate =
    allowCreate &&
    query.trim().length > 0 &&
    !suggestions.some((s) => s.name.toLowerCase() === query.trim().toLowerCase()) &&
    !selectedItems.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredSuggestions.length, query]);

  const handleInputChange = useCallback(
    (value: string): void => {
      onQueryChange(value);
      setIsOpen(true);
    },
    [onQueryChange]
  );

  const handleSelect = useCallback(
    (item: AutocompleteItem): void => {
      onSelect(item);
      onQueryChange('');
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onSelect, onQueryChange]
  );

  const handleCreate = useCallback((): void => {
    if (onCreate && canCreate) {
      onCreate(query.trim());
      onQueryChange('');
      setIsOpen(false);
      inputRef.current?.focus();
    }
  }, [onCreate, canCreate, query, onQueryChange]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      const totalItems = filteredSuggestions.length + (canCreate ? 1 : 0);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setIsOpen(true);
          setHighlightedIndex((prev) => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setIsOpen(true);
          setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            if (highlightedIndex < filteredSuggestions.length) {
              const suggestion = filteredSuggestions[highlightedIndex];
              if (suggestion) {
                handleSelect(suggestion);
              }
            } else if (canCreate) {
              handleCreate();
            }
          } else if (canCreate) {
            handleCreate();
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'Backspace':
          if (query === '' && selectedItems.length > 0) {
            const lastItem = selectedItems[selectedItems.length - 1];
            if (lastItem) {
              onRemove(lastItem);
            }
          }
          break;
      }
    },
    [
      filteredSuggestions,
      canCreate,
      highlightedIndex,
      handleSelect,
      handleCreate,
      query,
      selectedItems,
      onRemove,
    ]
  );

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Selected items - multi-select mode */}
      {!singleSelect && selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="primary"
              removable
              onRemove={() => { onRemove(item); }}
            >
              {item.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        {singleSelect && selectedItems.length > 0 && !isOpen ? (
          <div
            className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-gray-400"
            onClick={() => {
              setIsOpen(true);
              inputRef.current?.focus();
            }}
          >
            <span className="text-sm text-gray-900">{selectedItems[0]?.name}</span>
            <button
              type="button"
              className="ml-2 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedItems[0]) {
                  onRemove(selectedItems[0]);
                }
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { handleInputChange(e.target.value); }}
            onFocus={() => { setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder={singleSelect && selectedItems.length > 0 ? selectedItems[0]?.name : placeholder}
            error={error}
            helperText={helperText}
            rightIcon={isLoading ? <Spinner size="sm" /> : undefined}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (filteredSuggestions.length > 0 || canCreate) && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              className={`px-3 py-2 cursor-pointer text-sm ${
                highlightedIndex === index
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => { handleSelect(suggestion); }}
              onMouseEnter={() => { setHighlightedIndex(index); }}
            >
              {suggestion.name}
            </li>
          ))}
          {canCreate && (
            <li
              className={`px-3 py-2 cursor-pointer text-sm ${
                highlightedIndex === filteredSuggestions.length
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-gray-900 hover:bg-gray-50'
              }`}
              onClick={handleCreate}
              onMouseEnter={() => { setHighlightedIndex(filteredSuggestions.length); }}
            >
              Create &quot;{query.trim()}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
