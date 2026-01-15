/**
 * Graph page for network visualization
 */

import { type ReactNode, useCallback, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { GraphView } from '@/components/graph/GraphView';
import { PersonCard } from '@/components/contacts/PersonCard';
import { Button } from '@/components/ui/Button';
import {
  useGraph,
  useCreateEdge,
  useDeleteEdge,
  useRecomputeClusters,
} from '@/hooks/useGraph';
import type { GraphNode } from '@/types';

export function GraphPage(): ReactNode {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { data, isLoading } = useGraph();
  const createEdge = useCreateEdge();
  const deleteEdge = useDeleteEdge();
  const recomputeClusters = useRecomputeClusters();

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleEdgeCreate = useCallback(
    (sourceId: string, targetId: string) => {
      createEdge.mutate({
        source_id: sourceId,
        target_id: targetId,
      });
    },
    [createEdge]
  );

  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      deleteEdge.mutate(edgeId);
    },
    [deleteEdge]
  );

  const handleRecomputeClusters = useCallback(() => {
    recomputeClusters.mutate();
  }, [recomputeClusters]);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Network Graph</h1>
            <p className="mt-2 text-gray-600">
              Visualize relationships between contacts
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleRecomputeClusters}
              isLoading={recomputeClusters.isPending}
            >
              Recompute Clusters
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <GraphView
            data={data}
            isLoading={isLoading}
            onNodeClick={handleNodeClick}
            onEdgeCreate={handleEdgeCreate}
            onEdgeDelete={handleEdgeDelete}
          />
        </div>

        {selectedNodeId && (
          <PersonCard
            contactId={selectedNodeId}
            isOpen={!!selectedNodeId}
            onClose={() => { setSelectedNodeId(null); }}
          />
        )}
      </div>
    </Layout>
  );
}
