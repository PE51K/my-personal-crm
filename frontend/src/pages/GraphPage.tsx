/**
 * Graph page for network visualization
 */

import { type ReactNode, useCallback, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { GraphView } from '@/components/graph/GraphView';
import { PersonCard } from '@/components/contacts/PersonCard';
import {
  useGraph,
  useCreateEdge,
  useDeleteEdge,
} from '@/hooks/useGraph';
import type { GraphNode } from '@/types';

export function GraphPage(): ReactNode {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { data, isLoading } = useGraph();
  const createEdge = useCreateEdge();
  const deleteEdge = useDeleteEdge();

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

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Network Graph</h1>
            <p className="mt-2 text-base text-gray-600 opacity-80">
              Visualize relationships between contacts
            </p>
          </div>
        </div>

        <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-gray-700 overflow-hidden shadow-lg">
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
