/**
 * Association edge component for the graph view
 */

import { type ReactNode, memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';

export type AssociationEdgeData = {
  id: string;
  label: string | null;
  onEdgeDelete?: (edgeId: string) => void;
  [key: string]: unknown;
};

function AssociationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps): ReactNode {
  const edgeData = data as unknown as AssociationEdgeData | undefined;
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = useCallback(() => {
    if (edgeData?.onEdgeDelete) {
      edgeData.onEdgeDelete(edgeData.id);
    }
  }, [edgeData]);

  const showDeleteButton = isHovered || selected;

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        onMouseEnter={() => { setIsHovered(true); }}
        onMouseLeave={() => { setIsHovered(false); }}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: isHovered || selected ? 3 : 2,
          stroke: isHovered || selected ? '#6366F1' : '#9CA3AF',
          transition: 'stroke-width 0.2s, stroke 0.2s',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => { setIsHovered(true); }}
          onMouseLeave={() => { setIsHovered(false); }}
        >
          {edgeData?.label && (
            <div className="bg-white px-2 py-1 rounded shadow-sm text-xs text-gray-700 border border-gray-200 mb-1">
              {edgeData.label}
            </div>
          )}
          {showDeleteButton && edgeData?.onEdgeDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors mx-auto"
              aria-label="Delete connection"
              title="Delete connection"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const AssociationEdge = memo(AssociationEdgeComponent);
