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
  if (!name) return 'bg-gradient-to-br from-gray-400 to-gray-500';

  // Generate a consistent gradient color based on the name
  const gradients = [
    'bg-gradient-to-br from-red-400 to-red-600',
    'bg-gradient-to-br from-orange-400 to-orange-600',
    'bg-gradient-to-br from-amber-400 to-amber-600',
    'bg-gradient-to-br from-yellow-400 to-yellow-600',
    'bg-gradient-to-br from-lime-400 to-lime-600',
    'bg-gradient-to-br from-green-400 to-green-600',
    'bg-gradient-to-br from-emerald-400 to-emerald-600',
    'bg-gradient-to-br from-teal-400 to-teal-600',
    'bg-gradient-to-br from-cyan-400 to-cyan-600',
    'bg-gradient-to-br from-sky-400 to-sky-600',
    'bg-gradient-to-br from-blue-400 to-blue-600',
    'bg-gradient-to-br from-indigo-400 to-indigo-600',
    'bg-gradient-to-br from-violet-400 to-violet-600',
    'bg-gradient-to-br from-purple-400 to-purple-600',
    'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600',
    'bg-gradient-to-br from-pink-400 to-pink-600',
    'bg-gradient-to-br from-rose-400 to-rose-600',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % gradients.length;
  return gradients[index] ?? 'bg-gradient-to-br from-gray-400 to-gray-500';
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
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ring-2 ring-white ring-offset-1 ${styles.container} ${className}`}
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
          className={`w-full h-full flex items-center justify-center text-white font-semibold ${getBackgroundColor(name)} ${styles.text}`}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}
