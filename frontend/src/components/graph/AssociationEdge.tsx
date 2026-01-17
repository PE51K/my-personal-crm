/**
 * Association edge component for the graph view
 * Uses bezier curves for smooth, visible connections between nodes
 */

import { type ReactNode, memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from '@xyflow/react';

export type AssociationEdgeData = {
  id: string;
  label: string | null;
  onEdgeDelete?: (edgeId: string) => void;
  [key: string]: unknown;
};

// Node size for offset calculations
const NODE_RADIUS = 40;

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

  // Calculate direction vector from source to target
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Normalize and offset to start/end at node edge (not center)
  const offsetX = distance > 0 ? (dx / distance) * NODE_RADIUS : 0;
  const offsetY = distance > 0 ? (dy / distance) * NODE_RADIUS : 0;

  // Adjusted positions to connect from edge of circular nodes
  const adjustedSourceX = sourceX + offsetX;
  const adjustedSourceY = sourceY + offsetY;
  const adjustedTargetX = targetX - offsetX;
  const adjustedTargetY = targetY - offsetY;

  // Calculate bezier path with adjusted positions
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: adjustedSourceX,
    sourceY: adjustedSourceY,
    sourcePosition,
    targetX: adjustedTargetX,
    targetY: adjustedTargetY,
    targetPosition,
    curvature: 0.25,
  });

  const handleDelete = useCallback(() => {
    if (edgeData?.onEdgeDelete) {
      edgeData.onEdgeDelete(edgeData.id);
    }
  }, [edgeData]);

  const showDeleteButton = isHovered || selected;
  const isActive = isHovered || selected;

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={24}
        stroke="transparent"
        onMouseEnter={() => { setIsHovered(true); }}
        onMouseLeave={() => { setIsHovered(false); }}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Glow effect when hovered/selected */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={8}
          stroke="#6366F1"
          strokeOpacity={0.3}
          style={{ filter: 'blur(4px)' }}
        />
      )}
      
      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: isActive ? 3 : 2,
          stroke: isActive ? '#818CF8' : '#6B7280',
          strokeLinecap: 'round',
          transition: 'stroke-width 0.15s ease, stroke 0.15s ease',
        }}
      />
      
      {/* Arrow marker at target */}
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth={4}
          markerHeight={4}
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={isActive ? '#818CF8' : '#6B7280'}
          />
        </marker>
      </defs>
      
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
          {/* Label */}
          {edgeData?.label && (
            <div className="bg-gray-800 px-2 py-1 rounded shadow-lg text-xs text-gray-200 border border-gray-600 mb-1 whitespace-nowrap">
              {edgeData.label}
            </div>
          )}
          
          {/* Delete button */}
          {showDeleteButton && edgeData?.onEdgeDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-150 mx-auto hover:scale-110"
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
