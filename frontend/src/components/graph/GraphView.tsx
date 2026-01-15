/**
 * Graph view component for network visualization
 */

import { type ReactNode, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphResponse, GraphNode } from '@/types';
import { ContactNode, type ContactNodeData } from './ContactNode';
import { AssociationEdge, type AssociationEdgeData } from './AssociationEdge';
import { Spinner } from '@/components/ui/Spinner';

interface GraphViewProps {
  data: GraphResponse | undefined;
  isLoading: boolean;
  onNodeClick: (node: GraphNode) => void;
  onEdgeCreate: (sourceId: string, targetId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}

const nodeTypes: NodeTypes = {
  contact: ContactNode,
};

const edgeTypes: EdgeTypes = {
  association: AssociationEdge,
};

export function GraphView({
  data,
  isLoading,
  onNodeClick,
  onEdgeCreate,
  onEdgeDelete,
}: GraphViewProps): ReactNode {
  // Convert graph data to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    if (!data?.nodes) return [];

    return data.nodes.map((node, index) => ({
      id: node.id,
      type: 'contact',
      position: {
        x: node.position_x ?? index * 200,
        y: node.position_y ?? index * 150,
      },
      data: {
        ...node,
        onNodeClick,
      } as ContactNodeData,
    }));
  }, [data?.nodes, onNodeClick]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!data?.edges) return [];

    return data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source_id,
      target: edge.target_id,
      type: 'association',
      data: {
        id: edge.id,
        label: edge.label,
        onEdgeDelete,
      } as AssociationEdgeData,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
    }));
  }, [data?.edges, onEdgeDelete]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle connection creation
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onEdgeCreate(connection.source, connection.target);
        setEdges((eds) => addEdge(connection, eds));
      }
    },
    [onEdgeCreate, setEdges]
  );

  // Update nodes and edges when data changes
  useMemo(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);

  useMemo(() => {
    if (initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No contacts to display</p>
          <p className="text-sm mt-2">Add contacts to see them in the graph view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const nodeData = node.data as ContactNodeData | undefined;
            const clusterId = nodeData?.cluster_id;
            const clusterColors: Record<number, string> = {
              1: '#3B82F6',
              2: '#10B981',
              3: '#8B5CF6',
              4: '#F59E0B',
              5: '#EF4444',
              6: '#EC4899',
              7: '#6366F1',
              8: '#F97316',
            };
            return clusterId ? clusterColors[clusterId % 8] || '#9CA3AF' : '#9CA3AF';
          }}
          maskColor="rgb(240, 240, 240, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
