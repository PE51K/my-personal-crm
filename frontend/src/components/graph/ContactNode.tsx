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

function ContactNodeComponent({
  data,
  selected,
}: NodeProps): ReactNode {
  const nodeData = data as unknown as ContactNodeData;
  const fullName = [nodeData.first_name, nodeData.last_name].filter(Boolean).join(' ');

  return (
    <div
      className={`rounded-lg shadow-md p-3 border-2 border-gray-300 bg-white hover:shadow-lg transition-all cursor-pointer ${selected ? 'ring-2 ring-gray-200' : ''}`}
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
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
}

export const ContactNode = memo(ContactNodeComponent);
