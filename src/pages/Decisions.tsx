import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, ReactFlowProvider, addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { TreeKind, TreeNode, uid } from '../../shared/types';
import { seedTree } from '../../shared/seed';
import { useStore } from '../store';
import { Field, PageHead } from '../components/ui';

type DNode = Node<{ label: string; kind: TreeKind; note?: string }, 'decision'>;

const KIND_LABEL: Record<TreeKind, string> = { question: 'Decision', option: 'Option', outcome: 'Then / outcome' };

function DecisionNode({ data, selected }: NodeProps<DNode>) {
  return (
    <div className={`tnode ${data.kind} ${selected ? 'sel' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="k">{KIND_LABEL[data.kind]}</div>
      <div>{data.label || 'Untitled'}</div>
      {data.note && <div className="tiny muted" style={{ marginTop: 4, fontWeight: 400 }}>{data.note}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { decision: DecisionNode };

function Canvas() {
  const { state, update } = useStore();
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const nodes = useMemo(() => state.tree.nodes as unknown as DNode[], [state.tree.nodes]);
  const edges: Edge[] = useMemo(
    () => state.tree.edges.map((e) => ({ ...e, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, labelBgPadding: [8, 4] as [number, number], labelBgBorderRadius: 8, style: { strokeWidth: 1.6 } })),
    [state.tree.edges],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    update((s) => ({ ...s, tree: { ...s.tree, nodes: applyNodeChanges(changes, s.tree.nodes as unknown as DNode[]) as unknown as TreeNode[] } }));
  }, [update]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    update((s) => ({ ...s, tree: { ...s.tree, edges: (applyEdgeChanges(changes, s.tree.edges as Edge[]) as Edge[]).map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label as string | undefined })) } }));
  }, [update]);
  const onConnect = useCallback((c: Connection) => {
    update((s) => ({ ...s, tree: { ...s.tree, edges: (addEdge({ ...c, label: "if…" }, s.tree.edges as Edge[]) as Edge[]).map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label as string | undefined })) } }));
  }, [update]);

  const add = (kind: TreeKind) => {
    const id = uid('n');
    const rect = wrap.current?.getBoundingClientRect();
    const jitter = Math.random() * 60;
    update((s) => ({
      ...s,
      tree: { ...s.tree, nodes: [...s.tree.nodes, { id, type: 'decision', position: { x: 120 + jitter + (s.tree.nodes.length % 4) * 40, y: (rect ? 40 : 0) + jitter + (s.tree.nodes.length % 5) * 30 }, data: { label: kind === 'question' ? 'New decision?' : kind === 'option' ? 'New option' : 'New outcome', kind } }] },
    }));
    setSelNode(id);
    setSelEdge(null);
  };

  const node = state.tree.nodes.find((n) => n.id === selNode);
  const edge = state.tree.edges.find((e) => e.id === selEdge);
  const patchNode = (p: Partial<TreeNode['data']>) => update((s) => ({ ...s, tree: { ...s.tree, nodes: s.tree.nodes.map((n) => (n.id === selNode ? { ...n, data: { ...n.data, ...p } } : n)) } }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        if (selNode) { update((s) => ({ ...s, tree: { nodes: s.tree.nodes.filter((n) => n.id !== selNode), edges: s.tree.edges.filter((x) => x.source !== selNode && x.target !== selNode) } })); setSelNode(null); }
        else if (selEdge) { update((s) => ({ ...s, tree: { ...s.tree, edges: s.tree.edges.filter((x) => x.id !== selEdge) } })); setSelEdge(null); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selNode, selEdge, update]);

  return (
    <>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => add('question')}><Plus size={15} /> Decision</button>
        <button className="btn" onClick={() => add('option')}><Plus size={15} /> Option</button>
        <button className="btn" onClick={() => add('outcome')}><Plus size={15} /> Outcome</button>
        <span className="small muted">Drag from a node’s bottom dot to another node’s top dot to connect. Click a node or line to edit it.</span>
        <div className="grow" />
        <button className="btn ghost" onClick={() => confirm('Replace the tree with the starter example?') && update((s) => ({ ...s, tree: seedTree() }))}><RotateCcw size={14} /> Starter</button>
      </div>
      <div className="tree-wrap" ref={wrap}>
        <ReactFlow
          nodes={nodes as Node[]} edges={edges} nodeTypes={nodeTypes}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onNodeClick={(_, n) => { setSelNode(n.id); setSelEdge(null); }}
          onEdgeClick={(_, e) => { setSelEdge(e.id); setSelNode(null); }}
          onPaneClick={() => { setSelNode(null); setSelEdge(null); }}
          fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.3} deleteKeyCode={null} proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="#7B5B3D" maskColor="rgba(128,128,150,0.18)" style={{ borderRadius: 10 }} />
        </ReactFlow>
        {(node || edge) && (
          <div className="card tree-panel col">
            {node && (
              <>
                <Field label="Text"><textarea value={node.data.label} onChange={(e) => patchNode({ label: e.target.value })} style={{ minHeight: 60 }} /></Field>
                <Field label="Type">
                  <select value={node.data.kind} onChange={(e) => patchNode({ kind: e.target.value as TreeKind })}>
                    {(Object.keys(KIND_LABEL) as TreeKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                  </select>
                </Field>
                <Field label="Note"><input value={node.data.note ?? ''} onChange={(e) => patchNode({ note: e.target.value })} placeholder="Optional detail" /></Field>
                <button className="btn danger sm" onClick={() => { update((s) => ({ ...s, tree: { nodes: s.tree.nodes.filter((n) => n.id !== node.id), edges: s.tree.edges.filter((x) => x.source !== node.id && x.target !== node.id) } })); setSelNode(null); }}><Trash2 size={13} /> Delete node</button>
              </>
            )}
            {edge && (
              <>
                <Field label="Condition on this line" hint="e.g. “if venue is booked”, “then date moves later”"><input autoFocus value={edge.label ?? ''} onChange={(e) => update((s) => ({ ...s, tree: { ...s.tree, edges: s.tree.edges.map((x) => (x.id === edge.id ? { ...x, label: e.target.value } : x)) } }))} /></Field>
                <button className="btn danger sm" onClick={() => { update((s) => ({ ...s, tree: { ...s.tree, edges: s.tree.edges.filter((x) => x.id !== edge.id) } })); setSelEdge(null); }}><Trash2 size={13} /> Delete line</button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function Decisions() {
  return (
    <div className="page" style={{ maxWidth: 1500 }}>
      <PageHead eyebrow="Decision tree" title="If this, then that" subtitle="Map how one choice changes the next — a different venue can mean a different date, guest count or budget. Ask Claude to add branches for you too." />
      <ReactFlowProvider><Canvas /></ReactFlowProvider>
    </div>
  );
}
