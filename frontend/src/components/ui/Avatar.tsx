/**
 * Avatar component for contact photos
 */

import { useState, type ReactNode } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null | undefined;
  alt?: string;
  name?: string | undefined;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-base' },
  xl: { container: 'w-16 h-16', text: 'text-lg' },
};

function getInitials(name?: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1 && parts[0]) {
    return parts[0].charAt(0).toUpperCase();
  }
  const lastPart = parts[parts.length - 1];
  if (parts.length >= 2 && parts[0] && lastPart) {
    return `${parts[0].charAt(0)}${lastPart.charAt(0)}`.toUpperCase();
  }
  return '?';
}

function getBackgroundColor(name?: string): string {
  if (!name) return 'bg-gray-400';

  // Generate a consistent color based on the name
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? 'bg-gray-400';
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className = '',
}: AvatarProps): ReactNode {
  const [imageError, setImageError] = useState(false);

  const styles = sizeStyles[size];
  const showImage = src && !imageError;

  const handleImageError = (): void => {
    setImageError(true);
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${styles.container} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name ?? 'Avatar'}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-white font-medium ${getBackgroundColor(name)} ${styles.text}`}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}
