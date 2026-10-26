'use client';

import React, {useMemo, useState} from 'react';
import {
  ARCHITECTURE_LAYERS,
  ARCHITECTURE_NODES,
  ARCHITECTURE_EDGES,
  ArchitectureNode,
  ArchitectureEdge,
  TopologyMode,
} from '@/lib/ferrum-architecture';
import {ZoomIn, ZoomOut, RotateCcw} from 'lucide-react';

interface FerrumArchitectureCanvasProps {
  topologyMode: TopologyMode;
  customVisibleEdges?: ArchitectureEdge[];
  unfixedNodeIds?: string[];
  isFerrumRebranded?: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeTraceNodeId: string | null;
  activeTraceEdgeId: string | null;
  completedTraceNodeIds: string[];
  completedTraceEdgeIds: string[];
  highlightedAuditNodeIds: string[];
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
}

function computeEdgePath(
  source: ArchitectureNode,
  target: ArchitectureNode,
  edgeId: string
): {path: string; labelX: number; labelY: number} {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;

  if (edgeId === 'e_ferrum_data_json') {
    const startX = source.x;
    const startY = source.y + source.height * 0.65;
    const endX = target.x + target.width * 0.35;
    const endY = target.y;
    const gutterX = 64;
    return {
      path: `M ${startX} ${startY} L ${gutterX} ${startY} L ${gutterX} ${endY - 24} L ${endX} ${endY}`,
      labelX: gutterX + 26,
      labelY: (startY + endY) / 2,
    };
  }

  if (edgeId === 'e_ferrum_data_txt') {
    const startX = source.x + 14;
    const startY = source.y + source.height;
    const endX = target.x + target.width * 0.35;
    const endY = target.y;
    const gutterX = 148;
    return {
      path: `M ${startX} ${startY} L ${startX} ${startY + 26} L ${gutterX} ${startY + 26} L ${gutterX} ${endY - 24} L ${endX} ${endY}`,
      labelX: gutterX + 28,
      labelY: (startY + endY) / 2 + 20,
    };
  }

  if (edgeId === 'e_disp_data_json') {
    const startX = source.x + 16;
    const startY = source.y + source.height;
    const endX = target.x + target.width * 0.7;
    const endY = target.y;
    const midY = 362;
    const gutterX = 114;
    return {
      path: `M ${startX} ${startY} L ${startX} ${midY} L ${gutterX} ${midY} L ${gutterX} ${endY - 20} L ${endX} ${endY}`,
      labelX: gutterX,
      labelY: 560,
    };
  }

  if (edgeId === 'e_disp_data_txt') {
    const startX = source.x + 30;
    const startY = source.y + source.height;
    const endX = target.x + target.width * 0.7;
    const endY = target.y;
    const midY = 372;
    const gutterX = 186;
    return {
      path: `M ${startX} ${startY} L ${startX} ${midY} L ${gutterX} ${midY} L ${gutterX} ${endY - 20} L ${endX} ${endY}`,
      labelX: gutterX,
      labelY: 585,
    };
  }

  if (Math.abs(sy - ty) < 55) {
    const fromRight = sx < tx;
    const x1 = fromRight ? source.x + source.width : source.x;
    const y1 = sy;
    const x2 = fromRight ? target.x : target.x + target.width;
    const y2 = ty;
    const cx = (x1 + x2) / 2;
    return {
      path: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
      labelX: cx,
      labelY: (y1 + y2) / 2 - 8,
    };
  }

  const goingDown = ty > sy;
  const x1 = sx;
  const y1 = goingDown ? source.y + source.height : source.y;
  const x2 = tx;
  const y2 = goingDown ? target.y : target.y + target.height;
  const dy = (y2 - y1) * 0.52;

  return {
    path: `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`,
    labelX: (x1 + x2) / 2,
    labelY: (y1 + y2) / 2,
  };
}

export default function FerrumArchitectureCanvas({
  topologyMode,
  customVisibleEdges,
  unfixedNodeIds = [],
  isFerrumRebranded = true,
  selectedNodeId,
  selectedEdgeId,
  activeTraceNodeId,
  activeTraceEdgeId,
  completedTraceNodeIds,
  completedTraceEdgeIds,
  highlightedAuditNodeIds,
  onSelectNode,
  onSelectEdge,
}: FerrumArchitectureCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const nodeMap = useMemo(() => {
    const map = new Map<string, ArchitectureNode>();
    for (const n of ARCHITECTURE_NODES) {
      map.set(n.id, n);
    }
    return map;
  }, []);

  const visibleEdges = useMemo(() => {
    if (customVisibleEdges) return customVisibleEdges;
    return ARCHITECTURE_EDGES.filter((edge) => {
      if (topologyMode === 'original') {
        return edge.status === 'original' || edge.status === 'misrouted';
      }
      if (topologyMode === 'corrected') {
        return edge.status === 'original' || edge.status === 'repaired';
      }
      return true;
    });
  }, [topologyMode, customVisibleEdges]);

  const connectedToHovered = useMemo(() => {
    if (!hoveredNodeId) return null;
    const nodeIds = new Set<string>([hoveredNodeId]);
    const edgeIds = new Set<string>();
    for (const edge of visibleEdges) {
      if (edge.source === hoveredNodeId || edge.target === hoveredNodeId) {
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
        edgeIds.add(edge.id);
      }
    }
    return {nodeIds, edgeIds};
  }, [hoveredNodeId, visibleEdges]);

  return (
    <div className="relative flex flex-col w-full h-full bg-[#F8FAFC] border border-slate-200 rounded-lg overflow-hidden">
      {/* Canvas Sub-header Legend & Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-white border-b border-slate-200 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-900">5-Layer System Graph</span>
          <span aria-hidden="true">·</span>
          <span>Click any module or wire to inspect payload & dependencies</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-700">
            {visibleEdges.length} active routes
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Semantic Wire Key */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-slate-500" />
              <span>Baseline Wire</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="inline-block w-3 h-0.5 bg-emerald-600" />
              <span>Repaired Route</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-700 font-medium">
              <span className="inline-block w-3 h-0.5 border-b-2 border-dashed border-rose-600" />
              <span>Misrouted / Unfixed</span>
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-md bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.1).toFixed(2)))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.35, +(z + 0.1).toFixed(2)))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable / Zoomable SVG Stage */}
      <div className="relative flex-1 overflow-auto p-3">
        <div
          className="mx-auto transition-transform duration-150 origin-top"
          style={{
            width: `${Math.round(1190 * zoom)}px`,
            height: `${Math.round(850 * zoom)}px`,
          }}
        >
          <svg
            viewBox="0 0 1190 850"
            className="w-full h-full select-none"
            role="img"
            aria-label="Ferrum 5-Layer Architecture Interactive Diagram"
          >
            <defs>
              <pattern
                id="ferrum-grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="0.75"
                />
              </pattern>

              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#475569" />
              </marker>
              <marker
                id="arrow-repaired"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#059669" />
              </marker>
              <marker
                id="arrow-misrouted"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#DC2626" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#0284C7" />
              </marker>
            </defs>

            <rect width="1190" height="850" fill="url(#ferrum-grid)" />

            {/* 5 Layer Swimlanes */}
            {ARCHITECTURE_LAYERS.map((layer) => (
              <g key={layer.id}>
                <rect
                  x={layer.x}
                  y={layer.y}
                  width={layer.width}
                  height={layer.height}
                  rx={8}
                  fill={layer.surfaceBg}
                  stroke={layer.borderHex}
                  strokeWidth={1.5}
                />
                <text
                  x={layer.x + 14}
                  y={layer.y + 22}
                  className="font-display font-semibold text-[12px]"
                  fill="#0F172A"
                >
                  {layer.index}. {layer.title}
                </text>
                <text
                  x={layer.x + layer.width - 14}
                  y={layer.y + 21}
                  textAnchor="end"
                  className="text-[11px]"
                  fill="#64748B"
                >
                  {layer.subtitle}
                </text>
              </g>
            ))}

            {/* Authentication Module Nested Sub-container inside Layer 3 */}
            <g>
              <rect
                x={932}
                y={398}
                width={234}
                height={138}
                rx={6}
                fill="#FEF9C3"
                fillOpacity={0.55}
                stroke="#F59E0B"
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              <text
                x={1049}
                y={413}
                textAnchor="middle"
                className="font-display font-semibold text-[11px]"
                fill="#92400E"
              >
                Authentication Module
              </text>
            </g>

            {/* Edges / Wires */}
            {visibleEdges.map((edge) => {
              const sourceNode = nodeMap.get(edge.source);
              const targetNode = nodeMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const {path, labelX, labelY} = computeEdgePath(
                sourceNode,
                targetNode,
                edge.id
              );

              const isTraceActive = activeTraceEdgeId === edge.id;
              const isTraceCompleted = completedTraceEdgeIds.includes(edge.id);
              const isSelected = selectedEdgeId === edge.id;
              const isDimmed =
                connectedToHovered && !connectedToHovered.edgeIds.has(edge.id);

              let strokeColor = '#64748B';
              let strokeWidth = 1.65;
              let dashArray: string | undefined = undefined;
              let markerEnd = 'url(#arrow-default)';

              if (edge.status === 'repaired') {
                strokeColor = '#059669';
                strokeWidth = 2.1;
                markerEnd = 'url(#arrow-repaired)';
              } else if (edge.status === 'misrouted') {
                strokeColor = '#DC2626';
                strokeWidth = 2;
                dashArray = '6 4';
                markerEnd = 'url(#arrow-misrouted)';
              }

              if (isTraceCompleted) {
                strokeColor = '#0284C7';
                strokeWidth = 2.2;
                markerEnd = 'url(#arrow-active)';
              }

              if (isTraceActive || isSelected) {
                strokeColor = '#0284C7';
                strokeWidth = 3;
                dashArray = undefined;
                markerEnd = 'url(#arrow-active)';
              }

              return (
                <g
                  key={edge.id}
                  className="cursor-pointer transition-opacity duration-150"
                  style={{opacity: isDimmed ? 0.18 : 1}}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEdge(edge.id);
                  }}
                >
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                  />

                  <path
                    d={path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    markerEnd={markerEnd}
                    markerStart={edge.bidirectional ? markerEnd : undefined}
                  />

                  {isTraceActive && (
                    <path
                      d={path}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={3.5}
                      strokeDasharray="8 6"
                      className="animate-wire-flow"
                    />
                  )}

                  {edge.label && (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      className="font-mono text-[10px] font-medium"
                      fill={
                        edge.status === 'repaired'
                          ? '#047857'
                          : edge.status === 'misrouted'
                            ? '#B91C1C'
                            : '#334155'
                      }
                      stroke="#F8FAFC"
                      strokeWidth={3.5}
                      paintOrder="stroke"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Architecture Nodes */}
            {ARCHITECTURE_NODES.map((node) => {
              const layer = ARCHITECTURE_LAYERS.find((l) => l.id === node.layer)!;
              const isSelected = selectedNodeId === node.id;
              const isTraceActive = activeTraceNodeId === node.id;
              const isTraceCompleted = completedTraceNodeIds.includes(node.id);
              const isAuditHighlighted = highlightedAuditNodeIds.includes(node.id);
              const isDimmed =
                connectedToHovered && !connectedToHovered.nodeIds.has(node.id);

              const isUnfixedNode = unfixedNodeIds.includes(node.id);

              let fillHex = layer.nodeFillHex;
              let strokeHex = layer.nodeBorderHex;
              let strokeWidth = 1.5;

              if (node.id === 'ferrum_core') {
                fillHex = '#A7F3D0';
                strokeHex = '#047857';
                strokeWidth = 2.2;
              }

              if (isUnfixedNode) {
                strokeHex = '#DC2626';
                strokeWidth = 2;
              }

              if (isAuditHighlighted) {
                strokeHex = '#D97706';
                strokeWidth = 2.6;
              }

              if (isTraceCompleted) {
                strokeHex = '#0284C7';
                strokeWidth = 2.2;
              }

              if (isTraceActive || isSelected) {
                strokeHex = '#0284C7';
                strokeWidth = 3;
              }

              const displayLabel =
                node.id === 'ferrum_core' && !isFerrumRebranded
                  ? node.originalLabel || node.label
                  : topologyMode === 'original' && node.originalLabel
                    ? node.originalLabel
                    : node.label;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-opacity duration-150"
                  style={{opacity: isDimmed ? 0.25 : 1}}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => onSelectNode(node.id)}
                >
                  {(isTraceActive || isSelected || isAuditHighlighted) && (
                    <rect
                      x={-4}
                      y={-4}
                      width={node.width + 8}
                      height={node.height + 8}
                      rx={8}
                      fill="none"
                      stroke={isAuditHighlighted ? '#F59E0B' : '#0284C7'}
                      strokeWidth={2}
                      strokeOpacity={0.45}
                    />
                  )}

                  <rect
                    width={node.width}
                    height={node.height}
                    rx={5}
                    fill={fillHex}
                    stroke={strokeHex}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isUnfixedNode ? '4 3' : undefined}
                  />

                  <text
                    x={node.width / 2}
                    y={
                      node.id === 'ferrum_core' && isFerrumRebranded
                        ? node.height / 2 - 4
                        : node.height / 2 + 4
                    }
                    textAnchor="middle"
                    className="font-mono text-[11.5px] font-medium"
                    fill={layer.nodeTextHex}
                  >
                    {displayLabel}
                  </text>

                  {node.id === 'ferrum_core' && isFerrumRebranded && (
                    <text
                      x={node.width / 2}
                      y={node.height / 2 + 11}
                      textAnchor="middle"
                      className="font-sans text-[9.5px]"
                      fill="#065F46"
                    >
                      Ferrum Core (replaces jarvis.py)
                    </text>
                  )}

                  {isUnfixedNode && (
                    <text
                      x={node.width / 2}
                      y={-6}
                      textAnchor="middle"
                      className="font-mono text-[9.5px] font-semibold"
                      fill="#DC2626"
                    >
                      ▲ NEEDS FIX
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
