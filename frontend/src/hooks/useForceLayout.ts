/**
 * Hook for force-directed graph layout using d3-force
 * Creates an Obsidian-like liquid layout where nodes push/pull each other
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Node, Edge } from '@xyflow/react';

interface ForceNode extends SimulationNodeDatum {
  id: string;
  fx?: number | null;
  fy?: number | null;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
}

interface UseForceLayoutOptions {
  nodes: Node[];
  edges: Edge[];
  width: number;
  height: number;
  onTick: (nodes: Node[]) => void;
  enabled?: boolean;
}

interface UseForceLayoutReturn {
  simulation: Simulation<ForceNode, ForceLink> | null;
  restartSimulation: () => void;
  setDraggingNode: (nodeId: string | null, position?: { x: number; y: number }) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
}

export function useForceLayout({
  nodes,
  edges,
  width,
  height,
  onTick,
  enabled = true,
}: UseForceLayoutOptions): UseForceLayoutReturn {
  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null);
  const nodesRef = useRef<Node[]>(nodes);
  const forceNodesRef = useRef<ForceNode[]>([]);
  const draggingNodeRef = useRef<string | null>(null);

  // Update nodes ref
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Handle simulation tick - update React Flow nodes from d3 simulation
  const handleTick = useCallback(() => {
    if (!simulationRef.current) return;
    
    const forceNodes = simulationRef.current.nodes();
    forceNodesRef.current = forceNodes;
    
    const updatedNodes = nodesRef.current.map((node) => {
      const forceNode = forceNodes.find((fn) => fn.id === node.id);
      if (forceNode) {
        return {
          ...node,
          position: {
            x: forceNode.x ?? node.position.x,
            y: forceNode.y ?? node.position.y,
          },
        };
      }
      return node;
    });
    
    onTick(updatedNodes);
  }, [onTick]);

  // Initialize or update simulation
  useEffect(() => {
    if (!enabled || nodes.length === 0) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // Create force nodes - preserve positions from existing nodes if available
    const existingForceNodes = forceNodesRef.current;
    const forceNodes: ForceNode[] = nodes.map((node) => {
      const existing = existingForceNodes.find((fn) => fn.id === node.id);
      return {
        id: node.id,
        x: existing?.x ?? node.position.x,
        y: existing?.y ?? node.position.y,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        fx: existing?.fx ?? null,
        fy: existing?.fy ?? null,
      };
    });

    // Create force links
    const forceLinks: ForceLink[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create new simulation with Obsidian-like physics
    const simulation = forceSimulation<ForceNode>(forceNodes)
      // Repulsion between nodes - creates spacing
      .force('charge', forceManyBody<ForceNode>()
        .strength(-400)
        .distanceMin(50)
        .distanceMax(500)
      )
      // Link force - connected nodes attract each other
      .force('link', forceLink<ForceNode, ForceLink>(forceLinks)
        .id((d) => d.id)
        .distance(180)
        .strength(0.4)
      )
      // Gentle pull toward center to keep graph visible
      .force('centerX', forceX<ForceNode>(centerX).strength(0.02))
      .force('centerY', forceY<ForceNode>(centerY).strength(0.02))
      // Collision detection - prevent overlap
      .force('collide', forceCollide<ForceNode>().radius(55).strength(0.8))
      // Slow decay for smoother, more liquid-like motion
      .alphaDecay(0.015)
      .alphaMin(0.001)
      .velocityDecay(0.3)
      .on('tick', handleTick);

    simulationRef.current = simulation;
    forceNodesRef.current = forceNodes;

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [nodes.length, edges.length, width, height, enabled, handleTick]);

  // Update edges ref for use in callbacks
  const edgesRef = useRef(edges);
  useEffect(() => {
    edgesRef.current = edges;
    
    // Update simulation links when edges change
    if (simulationRef.current && edges.length > 0) {
      const forceLinks: ForceLink[] = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      }));

      simulationRef.current.force('link', forceLink<ForceNode, ForceLink>(forceLinks)
        .id((d) => d.id)
        .distance(180)
        .strength(0.4)
      );

      // Reheat slightly when edges change
      simulationRef.current.alpha(0.3).restart();
    }
  }, [edges]);

  // Set a node as being dragged (fixes its position, reheats simulation)
  const setDraggingNode = useCallback((nodeId: string | null, position?: { x: number; y: number }): void => {
    if (!simulationRef.current) return;

    const forceNodes = simulationRef.current.nodes();
    
    // Release previously dragged node
    if (draggingNodeRef.current) {
      const prevNode = forceNodes.find((n) => n.id === draggingNodeRef.current);
      if (prevNode) {
        prevNode.fx = null;
        prevNode.fy = null;
      }
    }

    draggingNodeRef.current = nodeId;

    // Fix new dragged node position
    if (nodeId && position) {
      const node = forceNodes.find((n) => n.id === nodeId);
      if (node) {
        node.fx = position.x;
        node.fy = position.y;
        node.x = position.x;
        node.y = position.y;
      }
    }

    // Reheat simulation for interactive dragging - other nodes will respond
    simulationRef.current.alpha(0.5).restart();
  }, []);

  // Update position of a node during drag
  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }): void => {
    if (!simulationRef.current) return;

    const forceNodes = simulationRef.current.nodes();
    const node = forceNodes.find((n) => n.id === nodeId);
    
    if (node) {
      node.fx = position.x;
      node.fy = position.y;
      node.x = position.x;
      node.y = position.y;
      
      // Keep simulation active during drag
      if (simulationRef.current.alpha() < 0.1) {
        simulationRef.current.alpha(0.3).restart();
      }
    }
  }, []);

  // Restart simulation with full energy
  const restartSimulation = useCallback((): void => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  }, []);

  return {
    simulation: simulationRef.current,
    restartSimulation,
    setDraggingNode,
    updateNodePosition,
  };
}
