/**
 * Graph view component for network visualization
 * Features:
 * - Round nodes with photos
 * - Interactive force-directed layout (Obsidian-like)
 * - Mode toggle for edge creation vs node dragging
 * - Visible edges with smooth curves
 */

import { type ReactNode, useCallback, useMemo, useState, useRef, useEffect } from 'react';
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
  type OnConnect,
  type OnNodeDrag,
  ReactFlowProvider,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphResponse, GraphNode } from '@/types';
import { ContactNode, type ContactNodeData } from './ContactNode';
import { AssociationEdge, type AssociationEdgeData } from './AssociationEdge';
import { Spinner } from '@/components/ui/Spinner';
import { useForceLayout } from '@/hooks/useForceLayout';

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

// Default edge style for visibility
const defaultEdgeOptions = {
  type: 'association',
  style: {
    stroke: '#9CA3AF',
    strokeWidth: 2,
  },
};

function GraphViewInner({
  data,
  isLoading,
  onNodeClick,
  onEdgeCreate,
  onEdgeDelete,
}: GraphViewProps): ReactNode {
  const [edgeCreationMode, setEdgeCreationMode] = useState(false);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions when container changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Use ResizeObserver for more accurate container size tracking
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

  // Convert graph data to React Flow format
  const initialNodes: Node[] = useMemo(() => {
    if (!data?.nodes) return [];

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    return data.nodes.map((node, index) => {
      // If no position stored, distribute nodes in a circle initially
      const angle = (2 * Math.PI * index) / data.nodes.length;
      const radius = Math.min(dimensions.width, dimensions.height) / 4;
      
      return {
        id: node.id,
        type: 'contact',
        position: {
          x: node.position_x ?? centerX + Math.cos(angle) * radius,
          y: node.position_y ?? centerY + Math.sin(angle) * radius,
        },
        data: {
          ...node,
          onNodeClick,
          isConnecting: connectingNodeId === node.id,
          edgeCreationMode,
        } as ContactNodeData,
      };
    });
  }, [data?.nodes, onNodeClick, dimensions, connectingNodeId, edgeCreationMode]);

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
    }));
  }, [data?.edges, onEdgeDelete]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle force layout updates
  const handleLayoutTick = useCallback(
    (updatedNodes: Node[]) => {
      setNodes(updatedNodes);
    },
    [setNodes]
  );

  // Use force layout - always enabled for fluid motion
  const { setDraggingNode, updateNodePosition } = useForceLayout({
    nodes,
    edges,
    width: dimensions.width,
    height: dimensions.height,
    onTick: handleLayoutTick,
    enabled: true, // Always running for interactive layout
  });

  // Update nodes and edges when data changes
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);

  useEffect(() => {
    if (data?.edges) {
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges, data?.edges]);

  // Handle connection creation (for edge creation mode)
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.source !== connection.target) {
        onEdgeCreate(connection.source, connection.target);
        const newEdgeId = `edge-${Date.now()}`;
        setEdges((eds) => addEdge({
          ...connection,
          id: newEdgeId,
          type: 'association',
          data: {
            id: newEdgeId,
            label: null,
            onEdgeDelete,
          },
        }, eds));
      }
    },
    [onEdgeCreate, setEdges, onEdgeDelete]
  );

  // Handle node click in edge creation mode (click-to-connect or remove connection)
  const handleNodeClickInEdgeMode = useCallback(
    (nodeId: string) => {
      if (!edgeCreationMode) return;

      if (!connectingNodeId) {
        // First click - start connection
        setConnectingNodeId(nodeId);
        // Update node data to show it's connecting
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, isConnecting: n.id === nodeId },
          }))
        );
      } else if (connectingNodeId !== nodeId) {
        // Second click - check if connection exists
        const existingEdge = edges.find(
          (edge) =>
            (edge.source === connectingNodeId && edge.target === nodeId) ||
            (edge.source === nodeId && edge.target === connectingNodeId)
        );

        if (existingEdge) {
          // Connection exists - remove it
          onEdgeDelete(existingEdge.id);
          setEdges((eds) => eds.filter((e) => e.id !== existingEdge.id));
        } else {
          // No connection - create new edge
          onEdgeCreate(connectingNodeId, nodeId);
          const newEdgeId = `edge-${connectingNodeId}-${nodeId}-${Date.now()}`;
          setEdges((eds) =>
            addEdge(
              {
                id: newEdgeId,
                source: connectingNodeId,
                target: nodeId,
                type: 'association',
                data: {
                  id: newEdgeId,
                  label: null,
                  onEdgeDelete,
                },
              },
              eds
            )
          );
        }
        
        setConnectingNodeId(null);
        // Clear connecting state
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, isConnecting: false },
          }))
        );
      } else {
        // Clicked same node - cancel
        setConnectingNodeId(null);
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, isConnecting: false },
          }))
        );
      }
    },
    [edgeCreationMode, connectingNodeId, onEdgeCreate, onEdgeDelete, setEdges, setNodes, edges]
  );

  // Update node click handler
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (edgeCreationMode) {
        handleNodeClickInEdgeMode(node.id);
      } else {
        const nodeData = node.data as ContactNodeData;
        onNodeClick(nodeData);
      }
    },
    [edgeCreationMode, handleNodeClickInEdgeMode, onNodeClick]
  );

  // Handle node drag start - fix position in simulation
  const handleNodeDragStart: OnNodeDrag = useCallback(
    (_event, node) => {
      if (edgeCreationMode) return;
      setDraggingNode(node.id, node.position);
    },
    [edgeCreationMode, setDraggingNode]
  );

  // Handle node dragging - update position in simulation
  const handleNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      if (edgeCreationMode) return;
      updateNodePosition(node.id, node.position);
    },
    [edgeCreationMode, updateNodePosition]
  );

  // Handle node drag end - release from fixed position
  const handleNodeDragEnd: OnNodeDrag = useCallback(
    (_event, _node) => {
      if (edgeCreationMode) return;
      setDraggingNode(null);
    },
    [edgeCreationMode, setDraggingNode]
  );

  // Handle background click to cancel edge creation
  const handlePaneClick = useCallback(() => {
    if (connectingNodeId) {
      setConnectingNodeId(null);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isConnecting: false },
        }))
      );
    }
  }, [connectingNodeId, setNodes]);

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
        <div className="text-center text-gray-400">
          <p className="text-lg font-medium">No contacts to display</p>
          <p className="text-sm mt-2">Add contacts to see them in the graph view</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 relative">
      {/* Mode Toggle Button */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-700 shadow-lg">
        <button
          onClick={() => {
            setEdgeCreationMode(false);
            setConnectingNodeId(null);
            setNodes((nds) =>
              nds.map((n) => ({
                ...n,
                data: { ...n.data, isConnecting: false, edgeCreationMode: false },
              }))
            );
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            !edgeCreationMode
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          Drag
        </button>
        <button
          onClick={() => {
            setEdgeCreationMode(true);
            setConnectingNodeId(null);
            setNodes((nds) =>
              nds.map((n) => ({
                ...n,
                data: { ...n.data, isConnecting: false, edgeCreationMode: true },
              }))
            );
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            edgeCreationMode
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Connect
        </button>
      </div>

      {/* Connection indicator */}
      {connectingNodeId && (
        <div className="absolute top-4 right-4 z-10 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-pulse">
          Click another node to create connection
        </div>
      )}

      {/* Edge creation mode indicator */}
      {edgeCreationMode && !connectingNodeId && (
        <div className="absolute top-4 right-4 z-10 bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm shadow-lg">
          Click a node to start connecting
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragEnd}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={!edgeCreationMode}
        nodesConnectable={edgeCreationMode}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={20} size={1} />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg !shadow-lg" />
        <MiniMap
          nodeColor={() => '#6366F1'}
          maskColor="rgba(17, 24, 39, 0.8)"
          className="!bg-gray-800 !border-gray-700 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphView(props: GraphViewProps): ReactNode {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}
