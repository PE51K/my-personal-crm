/**
 * Contact node component for the graph view
 */

import { type ReactNode, memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '@/types';
import { Avatar } from '@/components/ui/Avatar';

export type ContactNodeData = GraphNode & {
  onNodeClick?: (node: GraphNode) => void;
  [key: string]: unknown;
};

/**
 * Cluster color configuration for visual grouping
 */
const CLUSTER_STYLES: Record<number, { border: string; bg: string; ring: string }> = {
  1: { border: 'border-blue-500', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  2: { border: 'border-green-500', bg: 'bg-green-50', ring: 'ring-green-200' },
  3: { border: 'border-purple-500', bg: 'bg-purple-50', ring: 'ring-purple-200' },
  4: { border: 'border-yellow-500', bg: 'bg-yellow-50', ring: 'ring-yellow-200' },
  5: { border: 'border-red-500', bg: 'bg-red-50', ring: 'ring-red-200' },
  6: { border: 'border-pink-500', bg: 'bg-pink-50', ring: 'ring-pink-200' },
  7: { border: 'border-indigo-500', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
  8: { border: 'border-orange-500', bg: 'bg-orange-50', ring: 'ring-orange-200' },
};

const DEFAULT_CLUSTER_STYLE = { border: 'border-gray-300', bg: 'bg-white', ring: 'ring-gray-200' };

function ContactNodeComponent({
  data,
  selected,
}: NodeProps): ReactNode {
  const nodeData = data as unknown as ContactNodeData;
  const fullName = [nodeData.first_name, nodeData.last_name].filter(Boolean).join(' ');

  const clusterStyle = nodeData.cluster_id
    ? CLUSTER_STYLES[nodeData.cluster_id % 8] ?? DEFAULT_CLUSTER_STYLE
    : DEFAULT_CLUSTER_STYLE;

  return (
    <div
      className={`rounded-lg shadow-md p-3 border-2 ${clusterStyle.border} ${clusterStyle.bg} hover:shadow-lg transition-all cursor-pointer ${selected ? `ring-2 ${clusterStyle.ring}` : ''}`}
      onClick={() => { nodeData.onNodeClick?.(nodeData); }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      
      <div className="flex flex-col items-center gap-2 min-w-[120px]">
        <Avatar
          name={fullName}
          src={nodeData.photo_url ?? undefined}
          size="lg"
        />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[100px]">
            {fullName}
          </p>
          {nodeData.cluster_id && (
            <p className="text-xs text-gray-500">
              Cluster {nodeData.cluster_id}
            </p>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
}

export const ContactNode = memo(ContactNodeComponent);
