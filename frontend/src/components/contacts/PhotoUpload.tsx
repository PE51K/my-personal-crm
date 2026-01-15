/**
 * Photo upload component for contacts
 */

import { useCallback, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface PhotoUploadProps {
  currentPhotoUrl?: string | null | undefined;
  name?: string;
  onUpload: (file: File) => void;
  isUploading?: boolean;
  error?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function PhotoUpload({
  currentPhotoUrl,
  name,
  onUpload,
  isUploading = false,
  error,
}: PhotoUploadProps): ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setLocalError('Please upload a JPEG, PNG, or WebP image');
        return;
      }

      // Validate file size
      if (file.size > MAX_SIZE_BYTES) {
        setLocalError(`File size must be less than ${MAX_SIZE_MB}MB`);
        return;
      }

      // Clear any previous error
      setLocalError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = (): void => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Trigger upload
      onUpload(file);
    },
    [onUpload]
  );

  const handleButtonClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const displayError = error ?? localError;
  const displayPhotoUrl = previewUrl ?? currentPhotoUrl;

  return (
    <div className="flex flex-col items-center space-y-3">
      <Avatar src={displayPhotoUrl} name={name} size="xl" />

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleButtonClick}
        isLoading={isUploading}
      >
        {currentPhotoUrl ?? previewUrl ? 'Change Photo' : 'Upload Photo'}
      </Button>

      {displayError && (
        <p className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}

      <p className="text-xs text-gray-500">JPEG, PNG, or WebP. Max {MAX_SIZE_MB}MB.</p>
    </div>
  );
}
