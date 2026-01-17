/**
 * Contact node component for the graph view
 * Node is a round circle with photo inscribed inside
 */

import { type ReactNode, memo, useState } from 'react';
import { type NodeProps, Handle, Position } from '@xyflow/react';
import type { GraphNode } from '@/types';

export type ContactNodeData = GraphNode & {
  onNodeClick?: (node: GraphNode) => void;
  isConnecting?: boolean;
  edgeCreationMode?: boolean;
  [key: string]: unknown;
};

// Size of the round node
const NODE_SIZE = 80;

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0) ?? '';
  const last = lastName?.charAt(0) ?? '';
  return (first + last).toUpperCase() || '?';
}

function getBackgroundColor(name: string): string {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length] ?? '#6B7280';
}

function ContactNodeComponent({
  data,
  selected,
}: NodeProps): ReactNode {
  const nodeData = data as unknown as ContactNodeData;
  const fullName = [nodeData.first_name, nodeData.last_name].filter(Boolean).join(' ');
  const [imageError, setImageError] = useState(false);
  const hasImage = nodeData.photo_url && !imageError;
  const isConnecting = nodeData.isConnecting;

  return (
    <div className="flex flex-col items-center">
      {/* Hidden handles for edge connections - positioned at center */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!w-0 !h-0 !bg-transparent !border-none"
        style={{ right: NODE_SIZE / 2, top: NODE_SIZE / 2 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!w-0 !h-0 !bg-transparent !border-none"
        style={{ left: NODE_SIZE / 2, top: NODE_SIZE / 2 }}
      />
      
      {/* Round node container */}
      <div 
        className={`relative flex items-center justify-center transition-all duration-200 cursor-pointer`}
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: selected 
            ? '0 0 0 4px #3B82F6, 0 4px 12px rgba(0,0,0,0.3)' 
            : isConnecting
              ? '0 0 0 3px #10B981, 0 4px 12px rgba(0,0,0,0.3)'
              : '0 0 0 2px #4B5563, 0 4px 8px rgba(0,0,0,0.2)',
        }}
      >
        {hasImage && nodeData.photo_url ? (
          <img
            src={nodeData.photo_url}
            alt={fullName}
            onError={() => { setImageError(true); }}
            className="w-full h-full object-cover"
            style={{
              // Image fills the entire circle
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: getBackgroundColor(fullName) }}
          >
            {getInitials(nodeData.first_name, nodeData.last_name)}
          </div>
        )}
      </div>

      {/* Name label below node */}
      <div className="mt-2 text-center max-w-[120px]">
        <p className="text-sm font-medium text-gray-200 truncate drop-shadow-sm">
          {fullName}
        </p>
      </div>
    </div>
  );
}

export const ContactNode = memo(ContactNodeComponent);
