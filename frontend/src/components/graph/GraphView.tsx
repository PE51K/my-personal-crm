/**
 * Graph view component for network visualization using vis.js
 * Features:
 * - Round nodes with photos
 * - Physics-based layout with straight edges
 * - Mode toggle for edge creation vs node dragging
 * - Clean, Obsidian-like straight edges
 */

import { type ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import Graph from 'react-graph-vis';
import type { GraphResponse, GraphNode } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

interface GraphViewProps {
  data: GraphResponse | undefined;
  isLoading: boolean;
  onNodeClick: (node: GraphNode) => void;
  onEdgeCreate: (sourceId: string, targetId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}

// Pending edge change types
interface PendingEdgeAdd {
  type: 'add';
  sourceId: string;
  targetId: string;
  tempId: string;
}

interface PendingEdgeDelete {
  type: 'delete';
  edgeId: string;
}

type PendingChange = PendingEdgeAdd | PendingEdgeDelete;

// Generate a color based on the node ID for consistent, visually distinct colors
function getNodeColor(id: string): string {
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];

  // Simple hash function to get consistent color for same ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] || '#3B82F6';
}

export function GraphView({
  data,
  isLoading,
  onNodeClick,
  onEdgeCreate,
  onEdgeDelete,
}: GraphViewProps): ReactNode {
  const [edgeCreationMode, setEdgeCreationMode] = useState(false);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const networkRef = useRef<any>(null);
  const [network, setNetwork] = useState<any>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isStabilized, setIsStabilized] = useState(false);
  const [graphKey, setGraphKey] = useState(0);
  const nodePositions = useRef<Record<string, { x: number; y: number }>>({});

  // Convert backend data to vis.js format with pending changes applied
  const graphData = {
    nodes: data?.nodes.map((node) => {
      const fullName = `${node.first_name} ${node.last_name || ''}`.trim();
      const nodeColor = getNodeColor(node.id);

      const nodeConfig: any = {
        id: node.id,
        label: fullName,
        title: fullName, // Tooltip
        color: {
          background: nodeColor,
          border: edgeCreationMode && connectingNodeId === node.id ? '#22C55E' : '#1F2937',
          highlight: {
            background: nodeColor,
            border: '#60A5FA',
          },
          hover: {
            background: nodeColor,
            border: '#60A5FA',
          },
        },
        shape: node.photo_url ? 'circularImage' : 'dot',
        size: 40,
        font: {
          color: '#F3F4F6',
          size: 14,
          face: 'Inter, system-ui, sans-serif',
        },
        borderWidth: 3,
        borderWidthSelected: 4,
      };

      // Only add image if photo_url exists
      if (node.photo_url) {
        nodeConfig.image = node.photo_url;
      }

      // Apply stored positions if available (only after stabilization)
      if (isStabilized && nodePositions.current[node.id]) {
        nodeConfig.x = nodePositions.current[node.id].x;
        nodeConfig.y = nodePositions.current[node.id].y;
      }

      return nodeConfig;
    }) || [],
    edges: (() => {
      // Start with existing edges
      const existingEdges = data?.edges || [];

      // Filter out edges marked for deletion
      const edgesToDelete = new Set(
        pendingChanges.filter((c) => c.type === 'delete').map((c) => (c as PendingEdgeDelete).edgeId)
      );
      const filteredEdges = existingEdges.filter((edge) => !edgesToDelete.has(edge.id));

      // Get pending additions
      const pendingAdditions = pendingChanges.filter((c) => c.type === 'add') as PendingEdgeAdd[];

      // Filter out pending additions that now exist as real edges (to prevent duplicates after save)
      const filteredPendingAdditions = pendingAdditions.filter((pending) => {
        const matchingRealEdge = filteredEdges.find(
          (edge) =>
            (edge.source_id === pending.sourceId && edge.target_id === pending.targetId) ||
            (edge.source_id === pending.targetId && edge.target_id === pending.sourceId)
        );
        return !matchingRealEdge;
      });

      // Convert pending additions to edge format
      const pendingEdges = filteredPendingAdditions.map((add) => ({
        id: add.tempId,
        source_id: add.sourceId,
        target_id: add.targetId,
        label: undefined,
      }));

      // Combine edges
      const allEdges = [...filteredEdges, ...pendingEdges];

      // Deduplicate by ID as a safety measure
      const seenIds = new Set<string>();
      const uniqueEdges = allEdges.filter((edge) => {
        if (seenIds.has(edge.id)) {
          return false;
        }
        seenIds.add(edge.id);
        return true;
      });

      return uniqueEdges.map((edge) => {
        const isPending = edge.id.startsWith('pending-');
        const edgeConfig: any = {
          id: edge.id,
          from: edge.source_id,
          to: edge.target_id,
          smooth: false, // Straight edges
          color: {
            color: isPending ? '#FCD34D' : '#9CA3AF', // Yellow for pending
            highlight: '#818CF8',
            hover: '#818CF8',
            opacity: isPending ? 0.8 : 0.6,
          },
          width: isPending ? 2 : 1.5,
          dashes: isPending, // Dashed line for pending edges
          font: {
            color: '#E5E7EB',
            size: 12,
            background: '#374151',
            strokeWidth: 0,
          },
        };

        // Only add label if it exists
        if (edge.label) {
          edgeConfig.label = edge.label;
        }

        return edgeConfig;
      });
    })(),
  };

  // Graph options for Obsidian-like appearance
  const options = {
    layout: {
      improvedLayout: true,
      randomSeed: 2, // Consistent layout
    },
    physics: {
      enabled: true, // Always enabled, but nodes can be fixed individually
      stabilization: {
        enabled: true,
        iterations: 200,
        fit: true,
      },
      barnesHut: {
        gravitationalConstant: -8000,
        centralGravity: 0.3,
        springLength: 150,
        springConstant: 0.04,
        damping: 0.95,
        avoidOverlap: 0.5,
      },
    },
    nodes: {
      shape: 'dot',
      size: 40,
      font: {
        color: '#F3F4F6',
        size: 14,
        face: 'Inter, system-ui, sans-serif',
      },
      borderWidth: 3,
      borderWidthSelected: 4,
      shadow: {
        enabled: true,
        color: 'rgba(0, 0, 0, 0.5)',
        size: 10,
        x: 0,
        y: 0,
      },
    },
    edges: {
      smooth: false, // Straight edges for Obsidian-like look
      arrows: {
        to: false,
        from: false,
      },
      width: 1.5,
      color: {
        color: '#9CA3AF',
        highlight: '#818CF8',
        hover: '#818CF8',
        opacity: 0.6,
      },
      selectionWidth: 2,
      hoverWidth: 2,
      shadow: {
        enabled: false,
      },
      font: {
        color: '#E5E7EB',
        size: 12,
        background: '#374151',
        strokeWidth: 0,
      },
    },
    interaction: {
      dragNodes: !edgeCreationMode,
      dragView: true,
      zoomView: true,
      hover: true,
      navigationButtons: false,
      keyboard: false,
      tooltipDelay: 200,
      hideEdgesOnDrag: false,
      hideEdgesOnZoom: false,
    },
    height: '100%',
    width: '100%',
    autoResize: true,
  };

  // Handler to add pending edge change
  const handlePendingEdgeCreate = useCallback(
    (sourceId: string, targetId: string) => {
      // Capture positions before remount
      if (network && data?.nodes) {
        data.nodes.forEach((node) => {
          const position = network.getPositions([node.id])[node.id];
          if (position) {
            nodePositions.current[node.id] = position;
          }
        });
      }

      const tempId = `pending-${Date.now()}-${Math.random()}`;
      setPendingChanges((prev) => [
        ...prev,
        {
          type: 'add',
          sourceId,
          targetId,
          tempId,
        },
      ]);

      // Force remount to avoid react-graph-vis patching bugs
      setNetwork(null);
      setIsStabilized(true);
      setGraphKey(prev => prev + 1);
    },
    [network, data?.nodes]
  );

  // Handler to mark edge for deletion
  const handlePendingEdgeDelete = useCallback((edgeId: string) => {
    // Capture positions before remount
    if (network && data?.nodes) {
      data.nodes.forEach((node) => {
        const position = network.getPositions([node.id])[node.id];
        if (position) {
          nodePositions.current[node.id] = position;
        }
      });
    }

    setPendingChanges((prev) => {
      // If this is a pending addition, just remove it from the list
      const pendingAdd = prev.find(
        (c) => c.type === 'add' && (c as PendingEdgeAdd).tempId === edgeId
      );
      if (pendingAdd) {
        return prev.filter((c) => c !== pendingAdd);
      }

      // Otherwise, mark the existing edge for deletion
      return [...prev, { type: 'delete', edgeId }];
    });

    // Force remount to avoid react-graph-vis patching bugs
    setNetwork(null);
    setIsStabilized(true);
    setGraphKey(prev => prev + 1);
  }, [network, data?.nodes]);

  // Handler to save all pending changes
  const handleSaveChanges = useCallback(async () => {
    // Capture current positions before remounting
    if (network && data?.nodes) {
      data.nodes.forEach((node) => {
        const position = network.getPositions([node.id])[node.id];
        if (position) {
          nodePositions.current[node.id] = position;
        }
      });
    }

    // Consolidate pending changes to avoid duplicate operations
    const edgesToCreate = new Map<string, { sourceId: string; targetId: string }>();
    const edgesToDelete = new Set<string>();

    for (const change of pendingChanges) {
      if (change.type === 'add') {
        const add = change as PendingEdgeAdd;
        // Create a normalized key for the edge (sorted to handle bidirectional)
        const key = [add.sourceId, add.targetId].sort().join('|');
        edgesToCreate.set(key, { sourceId: add.sourceId, targetId: add.targetId });
      } else {
        const del = change as PendingEdgeDelete;
        // Only delete real edges, not temporary pending edges
        if (!del.edgeId.startsWith('pending-')) {
          edgesToDelete.add(del.edgeId);
        }
      }
    }

    // Apply all changes and wait for them to complete
    const promises: Promise<any>[] = [];

    // Create edges
    for (const edge of edgesToCreate.values()) {
      promises.push(
        Promise.resolve(onEdgeCreate(edge.sourceId, edge.targetId)).catch((err) => {
          console.error('Failed to create edge:', err);
        })
      );
    }

    // Delete edges
    for (const edgeId of edgesToDelete) {
      promises.push(
        Promise.resolve(onEdgeDelete(edgeId)).catch((err) => {
          console.error('Failed to delete edge:', err);
        })
      );
    }

    // Wait for all mutations to complete
    await Promise.all(promises);

    // Clear pending changes and force graph remount to avoid react-graph-vis patching bugs
    setPendingChanges([]);
    setNetwork(null);
    setIsStabilized(true); // Mark as stabilized so positions are applied on remount
    setGraphKey(prev => prev + 1);
  }, [pendingChanges, onEdgeCreate, onEdgeDelete, network, data?.nodes]);

  // Handler to discard all pending changes
  const handleDiscardChanges = useCallback(() => {
    // Capture current positions before remounting
    if (network && data?.nodes) {
      data.nodes.forEach((node) => {
        const position = network.getPositions([node.id])[node.id];
        if (position) {
          nodePositions.current[node.id] = position;
        }
      });
    }

    setPendingChanges([]);
    setConnectingNodeId(null);
    // Force graph remount to reset visual state
    setNetwork(null);
    setIsStabilized(true); // Mark as stabilized so positions are applied on remount
    setGraphKey(prev => prev + 1);
  }, [network, data?.nodes]);

  // Event handlers
  const events = {
    select: (event: any) => {
      const { nodes, edges } = event;

      if (edgeCreationMode && nodes.length > 0) {
        const clickedNodeId = nodes[0];

        if (!connectingNodeId) {
          // First click - start connection
          setConnectingNodeId(clickedNodeId);
        } else if (connectingNodeId !== clickedNodeId) {
          // Second click - check if connection exists
          // Check both actual edges and pending changes
          const existingEdge = data?.edges.find(
            (edge) =>
              (edge.source_id === connectingNodeId && edge.target_id === clickedNodeId) ||
              (edge.source_id === clickedNodeId && edge.target_id === connectingNodeId)
          );

          const pendingEdge = pendingChanges.find(
            (c) =>
              c.type === 'add' &&
              (((c as PendingEdgeAdd).sourceId === connectingNodeId &&
                (c as PendingEdgeAdd).targetId === clickedNodeId) ||
                ((c as PendingEdgeAdd).sourceId === clickedNodeId &&
                (c as PendingEdgeAdd).targetId === connectingNodeId))
          );

          if (existingEdge && !pendingChanges.find(c => c.type === 'delete' && (c as PendingEdgeDelete).edgeId === existingEdge.id)) {
            // Connection exists - mark for removal
            handlePendingEdgeDelete(existingEdge.id);
          } else if (pendingEdge) {
            // Pending connection exists - remove it
            handlePendingEdgeDelete((pendingEdge as PendingEdgeAdd).tempId);
          } else {
            // No connection - create new edge (pending)
            handlePendingEdgeCreate(connectingNodeId, clickedNodeId);
          }

          setConnectingNodeId(null);
        } else {
          // Clicked same node - cancel
          setConnectingNodeId(null);
        }
      } else if (!edgeCreationMode && nodes.length > 0) {
        // Regular node click
        const nodeData = data?.nodes.find((n) => n.id === nodes[0]);
        if (nodeData) {
          onNodeClick(nodeData);
        }
      }
    },
    doubleClick: (event: any) => {
      if (event.edges.length > 0) {
        // Double-click edge to delete (works in both modes now)
        handlePendingEdgeDelete(event.edges[0]);
      }
    },
  };

  // Get network instance
  const getNetwork = useCallback((networkInstance: any) => {
    if (networkInstance && !network) {
      setNetwork(networkInstance);
      networkRef.current = networkInstance;

      // Only set up stabilization callback if we don't already have positions
      if (!isStabilized || Object.keys(nodePositions.current).length === 0) {
        // Fit view and capture positions after stabilization
        networkInstance.once('stabilizationIterationsDone', () => {
          networkInstance.fit({
            animation: {
              duration: 500,
              easingFunction: 'easeInOutQuad',
            },
          });

          // Capture node positions and disable physics after animation completes
          setTimeout(() => {
            if (data?.nodes) {
              data.nodes.forEach((node) => {
                const position = networkInstance.getPositions([node.id])[node.id];
                if (position) {
                  nodePositions.current[node.id] = position;
                }
              });
              setIsStabilized(true);

              // Disable physics to prevent unwanted movement
              networkInstance.setOptions({
                physics: { enabled: false },
              });
            }
          }, 600); // Wait for fit animation to complete
        });
      } else {
        // Already have positions, disable physics and fit the view
        networkInstance.setOptions({
          physics: { enabled: false },
        });
        setTimeout(() => {
          networkInstance.fit({
            animation: {
              duration: 500,
              easingFunction: 'easeInOutQuad',
            },
          });
        }, 100);
      }
    }
  }, [network, isStabilized, data?.nodes]);

  // Update node colors when mode or connecting state changes
  useEffect(() => {
    if (network && data?.nodes) {
      const updates = data.nodes.map((node) => {
        const nodeColor = getNodeColor(node.id);
        return {
          id: node.id,
          color: {
            background: nodeColor,
            border: edgeCreationMode && connectingNodeId === node.id ? '#22C55E' : '#1F2937',
            highlight: {
              background: nodeColor,
              border: '#60A5FA',
            },
            hover: {
              background: nodeColor,
              border: '#60A5FA',
            },
          },
        };
      });

      network.body.data.nodes.update(updates);
    }
  }, [edgeCreationMode, connectingNodeId, network, data?.nodes]);

  // Update node positions when dragging stops
  useEffect(() => {
    if (!network || !isStabilized) return;

    const handleDragEnd = () => {
      if (data?.nodes) {
        data.nodes.forEach((node) => {
          const position = network.getPositions([node.id])[node.id];
          if (position) {
            nodePositions.current[node.id] = position;
          }
        });
      }
    };

    network.on('dragEnd', handleDragEnd);

    return () => {
      network.off('dragEnd', handleDragEnd);
    };
  }, [network, data?.nodes, isStabilized]);

  // Update interaction mode when switching between drag and edit
  useEffect(() => {
    if (!network) return;

    network.setOptions({
      interaction: {
        dragNodes: !edgeCreationMode,
        dragView: true,
        zoomView: true,
        hover: true,
        navigationButtons: false,
        keyboard: false,
        tooltipDelay: 200,
        hideEdgesOnDrag: false,
        hideEdgesOnZoom: false,
      },
    });
  }, [network, edgeCreationMode]);

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
    <div className="w-full h-full bg-gray-900 relative">
      {/* Mode Toggle Button */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-700 shadow-lg">
        <button
          onClick={() => {
            setEdgeCreationMode(false);
            setConnectingNodeId(null);
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

      {/* Save/Discard buttons */}
      {pendingChanges.length > 0 && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-700 shadow-lg">
          <div className="px-3 py-2 text-sm font-medium text-yellow-400">
            {pendingChanges.length} pending change{pendingChanges.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={handleDiscardChanges}
            className="px-4 py-2 rounded-md text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Discard
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all duration-200 flex items-center gap-2 shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </button>
        </div>
      )}

      {/* Connection indicator */}
      {connectingNodeId && (
        <div className="absolute top-20 right-4 z-10 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-pulse">
          Click another node to create/remove connection
        </div>
      )}

      {/* Edge creation mode indicator */}
      {edgeCreationMode && !connectingNodeId && pendingChanges.length === 0 && (
        <div className="absolute top-4 right-4 z-10 bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm shadow-lg">
          Click a node to start connecting (double-click edge to delete)
        </div>
      )}

      {/* Graph */}
      <Graph
        key={graphKey}
        graph={graphData}
        options={options}
        events={events}
        getNetwork={getNetwork}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}
