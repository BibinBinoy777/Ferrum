'use client';

import React, {useState, useEffect, useMemo} from 'react';
import Image from 'next/image';
import {
  ARCHITECTURE_LAYERS,
  ARCHITECTURE_NODES,
  ARCHITECTURE_EDGES,
  ANOMALY_AUDIT_ITEMS,
  COMMAND_TRACE_SCENARIOS,
  TopologyMode,
  ArchitectureNode,
  LayerId,
} from '@/lib/ferrum-architecture';
import FerrumArchitectureCanvas from '@/components/FerrumArchitectureCanvas';
import FerrumVoiceAssistant from '@/app/components/FerrumVoiceAssistant';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Eye,
  Volume2,
  Mic,
  Cpu,
  AudioLines,
  Wrench,
  MessageSquareCode,
  GitBranch,
  Newspaper,
  PlaySquare,
  Download,
  ScanText,
  BookOpen,
  ShoppingBag,
  BrainCircuit,
  Camera,
  ScanFace,
  Rss,
  CloudSun,
  Mail,
  Globe,
  Tv,
  FileJson,
  FileText,
  FileCode,
  Database,
  LayoutGrid,
  Network,
  ShieldCheck,
  Hammer,
  Check,
  LucideIcon,
} from 'lucide-react';

type ActiveSection = 'graph' | 'simulator' | 'audit' | 'reference';
type StageViewMode = 'grid' | 'svg';

interface RepairableIssue {
  id: string;
  title: string;
  issueType: 'Orphaned Nodes' | 'Broken / Misrouted Connection' | 'Core Rebrand';
  affectedNodeIds: string[];
  repairedEdgeIdsToAdd: string[];
  misroutedEdgeIdsToRemove: string[];
  symptom: string;
  fixActionLabel: string;
  fixDescription: string;
}

const REPAIRABLE_ISSUES: RepairableIssue[] = [
  {
    id: 'issue_weather_utilities',
    title: 'Orphaned Utilities & Weather API Nodes',
    issueType: 'Orphaned Nodes',
    affectedNodeIds: ['utilities_mod', 'weather_api'],
    repairedEdgeIdsToAdd: ['e_disp_utilities_fix', 'e_utilities_weather_fix'],
    misroutedEdgeIdsToRemove: [],
    symptom:
      'Utilities (Module Layer) and Weather API (External Services) have 0 connections in the raw diagram. Weather voice queries fail after the Dispatcher.',
    fixActionLabel: 'Fix Orphan Path',
    fixDescription:
      'Wired Command Parser/Dispatcher → Utilities → Weather API for live meteorological telemetry.',
  },
  {
    id: 'issue_auth_enrollment',
    title: 'Orphaned Biometric Enrollment (Sample generator.py & Model Trainer.py)',
    issueType: 'Orphaned Nodes',
    affectedNodeIds: ['sample_generator_py', 'model_trainer_py'],
    repairedEdgeIdsToAdd: [
      'e_sample_haar_fix',
      'e_sample_trainer_mod_fix',
      'e_trainer_yml_fix',
    ],
    misroutedEdgeIdsToRemove: [],
    symptom:
      'Sample generator.py and Model Trainer.py sit inside Authentication Module with zero edges, leaving trainer.yml without a training producer.',
    fixActionLabel: 'Fix Enrollment Pipeline',
    fixDescription:
      'Connected haarcascade_frontalface.xml → Sample generator.py → Model Trainer.py → trainer.yml.',
  },
  {
    id: 'issue_youtube_amazon',
    title: 'Misrouted amazon.py Wire & Unlinked YouTube Modules',
    issueType: 'Broken / Misrouted Connection',
    affectedNodeIds: ['youtube_py', 'youtube_downloader_py', 'amazon_py', 'youtube_ext'],
    repairedEdgeIdsToAdd: ['e_yt_ext_fix', 'e_yt_dl_ext_fix'],
    misroutedEdgeIdsToRemove: ['e_amazon_yt_misrouted'],
    symptom:
      'amazon.py erroneously points to YouTube while youtube.py and youtube_downloader.py terminate with no connection to the external YouTube service.',
    fixActionLabel: 'Fix Media & Web Routing',
    fixDescription:
      'Routed youtube.py & youtube_downloader.py to YouTube and removed the false amazon.py → YouTube edge.',
  },
  {
    id: 'issue_ocr_wiki',
    title: 'Broken Dependency: OCR.py Routed to Wikipedia API',
    issueType: 'Broken / Misrouted Connection',
    affectedNodeIds: ['ocr_py', 'wikipedia_api'],
    repairedEdgeIdsToAdd: [],
    misroutedEdgeIdsToRemove: ['e_ocr_wiki_misrouted'],
    symptom:
      'Raw diagram connects OCR.py to Wikipedia API even though optical character recognition runs locally via OpenCV and Tesseract.',
    fixActionLabel: 'Fix OCR Dependency',
    fixDescription:
      'Decoupled OCR.py from Wikipedia API so text extraction runs locally without network latency.',
  },
];

const NODE_ICON_MAP: Record<string, LucideIcon> = {
  speaker: Volume2,
  microphone: Mic,
  ferrum_core: Cpu,
  speech_recognition: AudioLines,
  helpers_py: Wrench,
  tts_pyttsx3: MessageSquareCode,
  command_dispatcher: GitBranch,
  news_py: Newspaper,
  youtube_py: PlaySquare,
  youtube_downloader_py: Download,
  ocr_py: ScanText,
  diction_py: BookOpen,
  utilities_mod: Sliders,
  amazon_py: ShoppingBag,
  model_trainer_py: BrainCircuit,
  sample_generator_py: Camera,
  face_recognition_py: ScanFace,
  news_api: Rss,
  weather_api: CloudSun,
  smtp_server: Mail,
  wikipedia_api: Globe,
  youtube_ext: Tv,
  data_json: FileJson,
  data_txt: FileText,
  haarcascade_xml: FileCode,
  trainer_yml: Database,
};

const LAYER_THEME_MAP: Record<
  LayerId,
  {
    containerBg: string;
    containerBorder: string;
    iconBoxBg: string;
    iconColor: string;
    activeRing: string;
  }
> = {
  user_io: {
    containerBg: 'bg-sky-50/50',
    containerBorder: 'border-sky-200',
    iconBoxBg: 'bg-sky-100/80',
    iconColor: 'text-sky-700',
    activeRing: 'ring-2 ring-sky-600 border-sky-600',
  },
  core_engine: {
    containerBg: 'bg-emerald-50/50',
    containerBorder: 'border-emerald-200',
    iconBoxBg: 'bg-emerald-100/80',
    iconColor: 'text-emerald-700',
    activeRing: 'ring-2 ring-emerald-600 border-emerald-600',
  },
  module_layer: {
    containerBg: 'bg-amber-50/50',
    containerBorder: 'border-amber-200',
    iconBoxBg: 'bg-amber-100/80',
    iconColor: 'text-amber-700',
    activeRing: 'ring-2 ring-amber-600 border-amber-600',
  },
  external_services: {
    containerBg: 'bg-violet-50/50',
    containerBorder: 'border-violet-200',
    iconBoxBg: 'bg-violet-100/80',
    iconColor: 'text-violet-700',
    activeRing: 'ring-2 ring-violet-600 border-violet-600',
  },
  data_models: {
    containerBg: 'bg-slate-100/70',
    containerBorder: 'border-slate-300',
    iconBoxBg: 'bg-slate-200/80',
    iconColor: 'text-slate-700',
    activeRing: 'ring-2 ring-slate-700 border-slate-700',
  },
};

export default function FerrumWorkbench() {
  // By default, hide the architecture workbench and present the clean Ferrum Voice Assistant
  const [showArchitectureWorkbench, setShowArchitectureWorkbench] =
    useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('graph');
  const [stageViewMode, setStageViewMode] = useState<StageViewMode>('grid');
  const [topologyMode, setTopologyMode] = useState<TopologyMode>('corrected');

  // Interactive Repair Mode Toggle & Per-Issue Fix State
  const [isRepairMode, setIsRepairMode] = useState<boolean>(false);
  const [fixedIssueIds, setFixedIssueIds] = useState<string[]>(
    REPAIRABLE_ISSUES.map((i) => i.id)
  );
  const [lastRepairBanner, setLastRepairBanner] = useState<string | null>(null);

  // Selection & Hover state for interactive 5-layer grid and inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('ferrum_core');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredGridNodeId, setHoveredGridNodeId] = useState<string | null>(null);
  const [highlightedAuditId, setHighlightedAuditId] = useState<string | null>(null);

  // Command Flow Simulator state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    COMMAND_TRACE_SCENARIOS[0].id
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoSwitchedNotice, setAutoSwitchedNotice] = useState<string | null>(null);

  // Audit filter state
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('all');

  // Toggle Repair Mode: if all issues are currently fixed when entering Repair Mode for the first time,
  // expose the unfixed anomalies so the user can interactively inspect and click "Fix" on each one!
  const handleToggleRepairMode = () => {
    setIsRepairMode((prev) => {
      const next = !prev;
      if (next && fixedIssueIds.length === REPAIRABLE_ISSUES.length) {
        setFixedIssueIds([]);
        setLastRepairBanner(
          'Repair scanner active: 4 architectural issues (orphaned nodes & broken connections) detected. Click "Fix" on any issue below or directly on a component card.'
        );
      } else if (!next) {
        setLastRepairBanner(null);
      }
      return next;
    });
  };

  const handleFixSingleIssue = (issue: RepairableIssue) => {
    setFixedIssueIds((prev) =>
      prev.includes(issue.id) ? prev : [...prev, issue.id]
    );
    setSelectedNodeId(issue.affectedNodeIds[0] || 'ferrum_core');
    setLastRepairBanner(`Fixed: ${issue.title} — ${issue.fixDescription}`);
  };

  const handleUnfixSingleIssue = (issueId: string) => {
    setFixedIssueIds((prev) => prev.filter((id) => id !== issueId));
    setLastRepairBanner(null);
  };

  const handleFixAllIssues = () => {
    setFixedIssueIds(REPAIRABLE_ISSUES.map((i) => i.id));
    setTopologyMode('corrected');
    setLastRepairBanner(
      'All 4 architectural anomalies repaired: 7 missing routes restored and 2 misrouted wires removed.'
    );
  };

  const handleResetAllIssues = () => {
    setFixedIssueIds([]);
    setTopologyMode('original');
    setLastRepairBanner(
      'Reset to raw unfixed diagram state: 4 architectural issues active.'
    );
  };

  // Compute active visible edges from either Repair Mode granular state or TopologyMode
  const visibleEdges = useMemo(() => {
    if (isRepairMode) {
      const addedRepairedIds = new Set<string>();
      const removedMisroutedIds = new Set<string>();

      for (const issue of REPAIRABLE_ISSUES) {
        if (fixedIssueIds.includes(issue.id)) {
          issue.repairedEdgeIdsToAdd.forEach((id) => addedRepairedIds.add(id));
          issue.misroutedEdgeIdsToRemove.forEach((id) =>
            removedMisroutedIds.add(id)
          );
        }
      }

      return ARCHITECTURE_EDGES.filter((edge) => {
        if (edge.status === 'original') return true;
        if (edge.status === 'repaired') return addedRepairedIds.has(edge.id);
        if (edge.status === 'misrouted')
          return !removedMisroutedIds.has(edge.id);
        return true;
      });
    }

    return ARCHITECTURE_EDGES.filter((edge) => {
      if (topologyMode === 'original') {
        return edge.status === 'original' || edge.status === 'misrouted';
      }
      if (topologyMode === 'corrected') {
        return edge.status === 'original' || edge.status === 'repaired';
      }
      return true;
    });
  }, [isRepairMode, fixedIssueIds, topologyMode]);

  // Identify which nodes currently have an unresolved repair issue
  const unfixedIssueByNodeId = useMemo(() => {
    const map = new Map<string, RepairableIssue>();
    for (const issue of REPAIRABLE_ISSUES) {
      const isFixed = isRepairMode
        ? fixedIssueIds.includes(issue.id)
        : topologyMode !== 'original';
      if (!isFixed) {
        for (const nodeId of issue.affectedNodeIds) {
          map.set(nodeId, issue);
        }
      }
    }
    return map;
  }, [isRepairMode, fixedIssueIds, topologyMode]);

  const unfixedNodeIds = useMemo(
    () => Array.from(unfixedIssueByNodeId.keys()),
    [unfixedIssueByNodeId]
  );

  const unresolvedIssuesCount = isRepairMode
    ? REPAIRABLE_ISSUES.length - fixedIssueIds.length
    : topologyMode === 'original'
      ? REPAIRABLE_ISSUES.length
      : 0;

  const currentScenario = useMemo(
    () =>
      COMMAND_TRACE_SCENARIOS.find((s) => s.id === selectedScenarioId) ||
      COMMAND_TRACE_SCENARIOS[0],
    [selectedScenarioId]
  );

  const currentTraceStep = useMemo(() => {
    if (currentStepIndex <= 0) return null;
    return currentScenario.steps[currentStepIndex - 1] || null;
  }, [currentScenario, currentStepIndex]);

  const completedTraceNodeIds = useMemo(() => {
    if (currentStepIndex <= 0) return [];
    return currentScenario.steps
      .slice(0, currentStepIndex)
      .map((s) => s.activeNodeId);
  }, [currentScenario, currentStepIndex]);

  const completedTraceEdgeIds = useMemo(() => {
    if (currentStepIndex <= 0) return [];
    return currentScenario.steps
      .slice(0, currentStepIndex)
      .map((s) => s.activeEdgeId)
      .filter((id): id is string => Boolean(id));
  }, [currentScenario, currentStepIndex]);

  const highlightedAuditNodeIds = useMemo(() => {
    if (!highlightedAuditId) return [];
    const item = ANOMALY_AUDIT_ITEMS.find((a) => a.id === highlightedAuditId);
    return item ? item.affectedNodeIds : [];
  }, [highlightedAuditId]);

  // Adjacency lookup for active/hovered node in the 5-layer grid
  const activeFocusNodeId = hoveredGridNodeId || selectedNodeId;
  const focusedAdjacency = useMemo(() => {
    if (!activeFocusNodeId) {
      return {upstreamIds: new Set<string>(), downstreamIds: new Set<string>()};
    }
    const upstreamIds = new Set<string>();
    const downstreamIds = new Set<string>();
    for (const edge of visibleEdges) {
      if (edge.target === activeFocusNodeId) {
        upstreamIds.add(edge.source);
      }
      if (edge.source === activeFocusNodeId) {
        downstreamIds.add(edge.target);
      }
      if (edge.bidirectional) {
        if (edge.source === activeFocusNodeId) upstreamIds.add(edge.target);
        if (edge.target === activeFocusNodeId) downstreamIds.add(edge.source);
      }
    }
    return {upstreamIds, downstreamIds};
  }, [activeFocusNodeId, visibleEdges]);

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying) return;

    const totalSteps = currentScenario.steps.length;
    if (currentStepIndex >= totalSteps) {
      setIsPlaying(false);
      return;
    }

    const delayMs = Math.round(1350 / playbackSpeed);
    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        return next <= totalSteps ? next : prev;
      });
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    isPlaying,
    currentStepIndex,
    selectedScenarioId,
    playbackSpeed,
    currentScenario.steps.length,
  ]);

  // Keep selected node synced with active trace step when simulating
  useEffect(() => {
    if (!currentTraceStep) return;
    setSelectedNodeId(currentTraceStep.activeNodeId);
    if (currentTraceStep.activeEdgeId) {
      setSelectedEdgeId(currentTraceStep.activeEdgeId);
    }
  }, [currentTraceStep]);

  const handleSelectScenario = (scenarioId: string) => {
    const targetScenario = COMMAND_TRACE_SCENARIOS.find(
      (s) => s.id === scenarioId
    );
    setSelectedScenarioId(scenarioId);
    setCurrentStepIndex(1);
    setIsPlaying(false);

    if (targetScenario?.requiresCorrectedTopology) {
      if (isRepairMode && fixedIssueIds.length < REPAIRABLE_ISSUES.length) {
        setFixedIssueIds(REPAIRABLE_ISSUES.map((i) => i.id));
        setAutoSwitchedNotice(
          `Automatically applied fixes for "${targetScenario.title}" so the voice trace can traverse previously orphaned nodes.`
        );
      } else if (!isRepairMode && topologyMode === 'original') {
        setTopologyMode('corrected');
        setAutoSwitchedNotice(
          `Switched topology to "Corrected Ferrum" because "${targetScenario.title}" traverses repaired orphan nodes.`
        );
      }
    } else {
      setAutoSwitchedNotice(null);
    }
  };

  const handleStartSimulationCTA = () => {
    setActiveSection('simulator');
    if (currentScenario.requiresCorrectedTopology) {
      if (isRepairMode) {
        setFixedIssueIds(REPAIRABLE_ISSUES.map((i) => i.id));
      } else if (topologyMode === 'original') {
        setTopologyMode('corrected');
      }
    }
    setCurrentStepIndex(1);
    setIsPlaying(true);
  };

  const selectedNode = useMemo(
    () => ARCHITECTURE_NODES.find((n) => n.id === selectedNodeId) || null,
    [selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => ARCHITECTURE_EDGES.find((e) => e.id === selectedEdgeId) || null,
    [selectedEdgeId]
  );

  const nodeConnections = useMemo(() => {
    if (!selectedNode) return {incoming: [], outgoing: []};
    const incoming = visibleEdges.filter((e) => e.target === selectedNode.id);
    const outgoing = visibleEdges.filter((e) => e.source === selectedNode.id);
    return {incoming, outgoing};
  }, [selectedNode, visibleEdges]);

  const filteredAuditItems = useMemo(() => {
    if (auditSeverityFilter === 'all') return ANOMALY_AUDIT_ITEMS;
    return ANOMALY_AUDIT_ITEMS.filter(
      (item) => item.severity === auditSeverityFilter
    );
  }, [auditSeverityFilter]);

  const renderGridNodeCard = (node: ArchitectureNode) => {
    const IconComponent = NODE_ICON_MAP[node.id] || Cpu;
    const layerTheme = LAYER_THEME_MAP[node.layer];
    const isSelected = selectedNodeId === node.id;
    const isTraceActive = currentTraceStep?.activeNodeId === node.id;
    const isTraceDone = completedTraceNodeIds.includes(node.id);
    const isAuditHighlighted = highlightedAuditNodeIds.includes(node.id);
    const isUpstream = focusedAdjacency.upstreamIds.has(node.id);
    const isDownstream = focusedAdjacency.downstreamIds.has(node.id);

    const activeUnfixedIssue = unfixedIssueByNodeId.get(node.id);
    const hasUnfixedIssue = Boolean(activeUnfixedIssue);

    const wasRepaired =
      !hasUnfixedIssue &&
      (node.anomalyStatus === 'orphaned' || node.anomalyStatus === 'miswired');

    const inCount = visibleEdges.filter((e) => e.target === node.id).length;
    const outCount = visibleEdges.filter((e) => e.source === node.id).length;

    const displayLabel =
      !isRepairMode && topologyMode === 'original' && node.originalLabel
        ? node.originalLabel
        : node.label;

    const isDimmed =
      hoveredGridNodeId !== null &&
      hoveredGridNodeId !== node.id &&
      !isUpstream &&
      !isDownstream;

    return (
      <div
        key={node.id}
        onMouseEnter={() => setHoveredGridNodeId(node.id)}
        onMouseLeave={() => setHoveredGridNodeId(null)}
        onClick={() => {
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
          setHighlightedAuditId(null);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
          }
        }}
        className={`group relative flex flex-col justify-between text-left p-3.5 rounded-lg bg-white border transition-all duration-150 cursor-pointer ${
          isTraceActive
            ? 'border-sky-600 ring-2 ring-sky-500/40 shadow-sm'
            : hasUnfixedIssue
              ? 'border-rose-500 border-dashed bg-rose-50/25 ring-1 ring-rose-400/40'
              : isSelected
                ? `${layerTheme.activeRing} shadow-xs`
                : isAuditHighlighted
                  ? 'border-amber-500 ring-2 ring-amber-400/40'
                  : isUpstream || isDownstream
                    ? 'border-sky-400 bg-sky-50/20'
                    : 'border-slate-200 hover:border-slate-300'
        } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
      >
        <div className="space-y-2.5 w-full">
          {/* Top Row: Lucide Icon + Connection Telemetry */}
          <div className="flex items-start justify-between gap-2">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                isTraceActive
                  ? 'bg-sky-600 text-white'
                  : hasUnfixedIssue
                    ? 'bg-rose-100 text-rose-700'
                    : `${layerTheme.iconBoxBg} ${layerTheme.iconColor}`
              }`}
            >
              <IconComponent className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
              <span title="Incoming connections">{inCount} in</span>
              <span aria-hidden="true">·</span>
              <span title="Outgoing connections">{outCount} out</span>
            </div>
          </div>

          {/* Module Name & Role */}
          <div>
            <div className="font-mono text-xs font-semibold text-slate-900 truncate">
              {displayLabel}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {node.role}
            </div>
          </div>
        </div>

        {/* Footer Metadata Line + Inline 'Fix' Button when issue is unresolved */}
        <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] w-full">
          {hasUnfixedIssue && activeUnfixedIssue ? (
            <>
              <span className="font-mono font-medium text-rose-700 truncate">
                ▲ {node.anomalyStatus === 'orphaned' ? 'Orphaned' : 'Miswired'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isRepairMode) {
                    setIsRepairMode(true);
                    setFixedIssueIds([activeUnfixedIssue.id]);
                  } else {
                    handleFixSingleIssue(activeUnfixedIssue);
                  }
                }}
                className="px-2.5 py-1 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Fix
              </button>
            </>
          ) : isTraceActive ? (
            <span className="font-mono font-semibold text-sky-700">
              ▶ Active Step 0{currentTraceStep?.stepIndex}
            </span>
          ) : isTraceDone ? (
            <span className="font-mono text-sky-700">✓ Traversed</span>
          ) : wasRepaired ? (
            <span className="font-mono font-medium text-emerald-700">
              ✓ Repaired Route
            </span>
          ) : node.id === 'ferrum_core' ? (
            <span className="font-mono font-medium text-emerald-800">
              Replaces jarvis.py
            </span>
          ) : node.anomalyStatus === 'bottleneck' ? (
            <span className="font-mono text-amber-700">11 Fan-Out Routes</span>
          ) : (
            <span className="font-mono text-slate-400 truncate">
              {node.pythonDependencies[0]}
            </span>
          )}

          {!hasUnfixedIssue && isUpstream && (
            <span className="font-mono text-[10px] text-sky-700 flex items-center gap-0.5 shrink-0">
              <ArrowUpRight className="w-3 h-3" />
              Upstream
            </span>
          )}
          {!hasUnfixedIssue && isDownstream && (
            <span className="font-mono text-[10px] text-emerald-700 flex items-center gap-0.5 shrink-0">
              <ArrowDownLeft className="w-3 h-3" />
              Downstream
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!showArchitectureWorkbench) {
    return (
      <FerrumVoiceAssistant
        onOpenArchitecture={() => setShowArchitectureWorkbench(true)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('graph');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Ferrum Architecture
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveSection('graph')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 underline-offset-8 cursor-pointer ${
              activeSection === 'graph' ? 'text-slate-900 underline' : ''
            }`}
          >
            Interactive Architecture
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('simulator')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 underline-offset-8 cursor-pointer ${
              activeSection === 'simulator' ? 'text-slate-900 underline' : ''
            }`}
          >
            Flow Simulator
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('audit');
              const el = document.getElementById('anomaly-audit-section');
              el?.scrollIntoView({behavior: 'smooth'});
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 underline-offset-8 cursor-pointer ${
              activeSection === 'audit' ? 'text-slate-900 underline' : ''
            }`}
          >
            Anomaly Audit
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('reference');
              const el = document.getElementById('reference-diagram-section');
              el?.scrollIntoView({behavior: 'smooth'});
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 underline-offset-8 cursor-pointer ${
              activeSection === 'reference' ? 'text-slate-900 underline' : ''
            }`}
          >
            Reference Diagram
          </button>
        </nav>

        {/* Zone 3: Return to Ferrum Voice Assistant or Run Trace */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowArchitectureWorkbench(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-600" />
            <span>Voice Assistant</span>
          </button>
          <button
            type="button"
            onClick={handleStartSimulationCTA}
            className="px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Run Trace Simulation
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px Desktop Presence) */}
      <main
        id="top"
        className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-6 space-y-6"
      >
        {/* Workspace Hero Header & Mode Controls */}
        <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-5 border-b border-slate-200">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>5-Layer System Architecture Workbench</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-700">
                ferrum.py Core Engine
              </span>
              <span aria-hidden="true">·</span>
              <span>21 Modules · 6 Voice Execution Traces</span>
            </div>
            <h1
              className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              style={{textWrap: 'balance'}}
            >
              Ferrum Interactive 5-Layer Architecture & Flow Simulator
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Inspect every module across the five architectural tiers of{' '}
              <code className="font-mono text-slate-800">ferrum.py</code>,
              toggle <strong>Repair Mode</strong> to identify and fix orphaned
              nodes or broken connections, and trace live voice commands step by
              step.
            </p>
          </div>

          {/* Stage View Mode, Repair Toggle & Topology Wiring Controls */}
          <div className="flex flex-wrap items-end gap-3 shrink-0">
            {/* Repair Toggle Button */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Diagnostic Scanner
              </span>
              <button
                type="button"
                aria-pressed={isRepairMode}
                onClick={handleToggleRepairMode}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isRepairMode
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Repair</span>
                <span className="font-mono tabular-nums">
                  ·{' '}
                  {unresolvedIssuesCount > 0
                    ? `${unresolvedIssuesCount} Issues`
                    : 'All Fixed'}
                </span>
              </button>
            </div>

            {/* View Mode Toggle: 5-Layer Icon Grid vs SVG Wire Graph */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Architecture View
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStageViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    stageViewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>5-Layer Icon Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStageViewMode('svg')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    stageViewMode === 'svg'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>SVG Wire Canvas</span>
                </button>
              </div>
            </div>

            {/* Topology Wiring Mode Switcher */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Topology Preset
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsRepairMode(false);
                    setTopologyMode('corrected');
                    setFixedIssueIds(REPAIRABLE_ISSUES.map((i) => i.id));
                    setAutoSwitchedNotice(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    !isRepairMode && topologyMode === 'corrected'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Corrected Ferrum
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRepairMode(false);
                    setTopologyMode('diff');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    !isRepairMode && topologyMode === 'diff'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Diff Overlay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRepairMode(false);
                    setTopologyMode('original');
                    setFixedIssueIds([]);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    !isRepairMode && topologyMode === 'original'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Raw Diagram
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Repair Panel (Rendered when Repair Toggle is ON) */}
        {isRepairMode && (
          <section className="bg-white border border-amber-300 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                  <Hammer className="w-3.5 h-3.5" />
                  <span>
                    Interactive Architecture Repair Scanner ·{' '}
                    {fixedIssueIds.length} of {REPAIRABLE_ISSUES.length} Issues
                    Fixed
                  </span>
                </div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Orphaned Nodes & Broken Connections Diagnostic Queue
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetAllIssues}
                  disabled={fixedIssueIds.length === 0}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  Simulate Unfixed State
                </button>
                <button
                  type="button"
                  onClick={handleFixAllIssues}
                  disabled={fixedIssueIds.length === REPAIRABLE_ISSUES.length}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                >
                  Fix All Issues ({REPAIRABLE_ISSUES.length})
                </button>
              </div>
            </div>

            {lastRepairBanner && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lastRepairBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLastRepairBanner(null)}
                  className="text-emerald-800 hover:text-emerald-950 font-medium shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {REPAIRABLE_ISSUES.map((issue) => {
                const isFixed = fixedIssueIds.includes(issue.id);
                return (
                  <div
                    key={issue.id}
                    className={`flex flex-col justify-between p-4 rounded-lg border transition-colors ${
                      isFixed
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-rose-50/30 border-rose-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {issue.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {issue.issueType} · Modules:{' '}
                            <span className="font-mono text-slate-700">
                              {issue.affectedNodeIds
                                .map(
                                  (id) =>
                                    ARCHITECTURE_NODES.find((n) => n.id === id)
                                      ?.label
                                )
                                .join(', ')}
                            </span>
                          </div>
                        </div>

                        {isFixed ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                              Fixed
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnfixSingleIssue(issue.id)}
                              className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded transition-colors cursor-pointer"
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleFixSingleIssue(issue)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Fix
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {isFixed ? issue.fixDescription : issue.symptom}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Auto-Switch Notification Banner */}
        {autoSwitchedNotice && (
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{autoSwitchedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoSwitchedNotice(null)}
              className="text-sky-700 hover:text-sky-950 font-medium whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Zone Sandbox Layout: 65% Interactive 5-Layer Stage (Left) + 35% Control & Inspector Deck (Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone: Interactive 5-Layer Visual Grid OR SVG Wire Canvas (8 cols) */}
          <div className="lg:col-span-8 flex flex-col">
            {stageViewMode === 'grid' ? (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {/* Grid Sub-header */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      5-Layer Interactive Component Grid
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Hover any component to highlight upstream/downstream
                      dependencies
                    </span>
                  </div>
                  <div className="font-mono text-slate-700 tabular-nums">
                    21 components · {visibleEdges.length} active routes
                  </div>
                </div>

                {/* 5 Architectural Layers Stack */}
                <div className="p-5 space-y-5">
                  {ARCHITECTURE_LAYERS.map((layer) => {
                    const layerTheme = LAYER_THEME_MAP[layer.id];
                    const layerNodes = ARCHITECTURE_NODES.filter(
                      (n) => n.layer === layer.id
                    );
                    const standardNodes = layerNodes.filter((n) => !n.subGroup);
                    const authSubGroupNodes = layerNodes.filter(
                      (n) => n.subGroup === 'Authentication Module'
                    );

                    return (
                      <div
                        key={layer.id}
                        className={`p-4 rounded-lg border ${layerTheme.containerBg} ${layerTheme.containerBorder} space-y-3.5`}
                      >
                        {/* Layer Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                              {layer.index}.
                            </span>
                            <h2 className="font-display text-sm font-bold text-slate-900">
                              {layer.title}
                            </h2>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{layer.subtitle}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-700 tabular-nums shrink-0">
                              {layerNodes.length} modules
                            </span>
                          </div>
                        </div>

                        {/* Standard Layer Component Cards Grid */}
                        <div
                          className={`grid gap-3 ${
                            layer.id === 'user_io'
                              ? 'grid-cols-1 sm:grid-cols-2'
                              : layer.id === 'core_engine'
                                ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                                : layer.id === 'module_layer'
                                  ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
                                  : layer.id === 'external_services'
                                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-5'
                                    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
                          }`}
                        >
                          {standardNodes.map((node) => renderGridNodeCard(node))}
                        </div>

                        {/* Nested Authentication Module Sub-Group (inside Layer 03) */}
                        {authSubGroupNodes.length > 0 && (
                          <div className="mt-3 p-3.5 rounded-lg bg-amber-100/40 border border-amber-300/80 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-amber-950">
                                <ShieldCheck className="w-4 h-4 text-amber-700" />
                                <span>
                                  Authentication Module Sub-Group (OpenCV
                                  Biometrics)
                                </span>
                              </div>
                              <span className="text-[11px] text-amber-900/80">
                                {unfixedNodeIds.includes('sample_generator_py')
                                  ? 'Unfixed: Sample generator.py & Model Trainer.py are orphaned'
                                  : 'Repaired: Enrollment → LBPH Training → Runtime Face Verification'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {authSubGroupNodes.map((node) =>
                                renderGridNodeCard(node)
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="min-h-[740px] flex flex-col">
                <FerrumArchitectureCanvas
                  topologyMode={topologyMode}
                  customVisibleEdges={visibleEdges}
                  unfixedNodeIds={unfixedNodeIds}
                  selectedNodeId={selectedNodeId}
                  selectedEdgeId={selectedEdgeId}
                  activeTraceNodeId={currentTraceStep?.activeNodeId || null}
                  activeTraceEdgeId={currentTraceStep?.activeEdgeId || null}
                  completedTraceNodeIds={completedTraceNodeIds}
                  completedTraceEdgeIds={completedTraceEdgeIds}
                  highlightedAuditNodeIds={highlightedAuditNodeIds}
                  onSelectNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setSelectedEdgeId(null);
                    setHighlightedAuditId(null);
                  }}
                  onSelectEdge={(edgeId) => {
                    setSelectedEdgeId(edgeId);
                    setHighlightedAuditId(null);
                  }}
                />
              </div>
            )}
          </div>

          {/* Right Zone: Control & Concept Deck (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Panel 1: Step-by-Step Voice Command Flow Simulator */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Voice Command Trace Simulator
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step through synchronous data flow across all 5 Ferrum layers
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-600 tabular-nums">
                  Step {currentStepIndex} / {currentScenario.steps.length}
                </span>
              </div>

              {/* Scenario Selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor="scenario-select"
                  className="block text-xs font-medium text-slate-700"
                >
                  Select Voice Command Scenario
                </label>
                <select
                  id="scenario-select"
                  value={selectedScenarioId}
                  onChange={(e) => handleSelectScenario(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {COMMAND_TRACE_SCENARIOS.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.title}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span className="font-mono text-slate-700 truncate">
                    {currentScenario.voiceUtterance}
                  </span>
                  <span className="shrink-0">{currentScenario.category}</span>
                </div>
              </div>

              {/* Playback Controls Bar */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIndex(0);
                    }}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Reset Trace"
                    aria-label="Reset Trace"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentStepIndex <= 1}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIndex((s) => Math.max(1, s - 1));
                    }}
                    className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-40 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Previous Step"
                    aria-label="Previous Step"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        currentStepIndex === 0 ||
                        currentStepIndex >= currentScenario.steps.length
                      ) {
                        setCurrentStepIndex(1);
                        setIsPlaying(true);
                      } else {
                        setIsPlaying((p) => !p);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>
                          {currentStepIndex === 0 ? 'Start Trace' : 'Play'}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={currentStepIndex >= currentScenario.steps.length}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIndex((s) =>
                        Math.min(currentScenario.steps.length, s + 1)
                      );
                    }}
                    className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-40 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Next Step"
                    aria-label="Next Step"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Speed Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                  {[0.5, 1, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-1 font-mono text-[11px] rounded transition-colors cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-white text-slate-900 font-medium shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Step Inspector Box */}
              {currentTraceStep ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-sky-700">
                      Step 0{currentTraceStep.stepIndex}:{' '}
                      {currentTraceStep.actionTitle}
                    </span>
                    <span className="font-mono tabular-nums">
                      {currentTraceStep.latencyMs} ms
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentTraceStep.description}
                  </p>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-500">
                      Data Payload · State Transition
                    </div>
                    <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto leading-relaxed">
                      {currentTraceStep.payloadSample}
                      {'\n'}→ {currentTraceStep.stateMutation}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 space-y-2">
                  <p className="leading-relaxed">{currentScenario.summary}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span>
                      Click &ldquo;Start Trace&rdquo; or any step below to
                      inspect hops
                    </span>
                    <span className="font-mono tabular-nums">
                      {currentScenario.steps.length} total hops
                    </span>
                  </div>
                </div>
              )}

              {/* Clickable Step Timeline List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                {currentScenario.steps.map((step) => {
                  const isCurrent = currentStepIndex === step.stepIndex;
                  const isDone = currentStepIndex > step.stepIndex;
                  const nodeObj = ARCHITECTURE_NODES.find(
                    (n) => n.id === step.activeNodeId
                  );
                  const StepIcon = NODE_ICON_MAP[step.activeNodeId] || Cpu;
                  return (
                    <button
                      key={step.stepIndex}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIndex(step.stepIndex);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-50 text-sky-950 font-medium'
                          : isDone
                            ? 'bg-white text-slate-700 hover:bg-slate-50'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                          0{step.stepIndex}
                        </span>
                        <StepIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{step.actionTitle}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {nodeObj?.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel 2: Selected Module / Wire Specification Inspector */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  {selectedEdge
                    ? 'Route / Wire Inspector'
                    : 'Module Specification'}
                </h2>
                {selectedEdge && (
                  <button
                    type="button"
                    onClick={() => setSelectedEdgeId(null)}
                    className="text-xs text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
                  >
                    Back to Module
                  </button>
                )}
              </div>

              {selectedEdge ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-mono text-slate-900 text-sm">
                    <span>
                      {
                        ARCHITECTURE_NODES.find(
                          (n) => n.id === selectedEdge.source
                        )?.label
                      }
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {
                        ARCHITECTURE_NODES.find(
                          (n) => n.id === selectedEdge.target
                        )?.label
                      }
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-slate-500">
                    <span>Protocol: {selectedEdge.protocol}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        selectedEdge.status === 'repaired'
                          ? 'text-emerald-700 font-medium'
                          : selectedEdge.status === 'misrouted'
                            ? 'text-rose-700 font-medium'
                            : 'text-slate-700'
                      }
                    >
                      Status: {selectedEdge.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    {selectedEdge.explanation}
                  </p>
                </div>
              ) : selectedNode ? (
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-start gap-3">
                    {(() => {
                      const SelectedIcon =
                        NODE_ICON_MAP[selectedNode.id] || Cpu;
                      const theme = LAYER_THEME_MAP[selectedNode.layer];
                      return (
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBoxBg} ${theme.iconColor}`}
                        >
                          <SelectedIcon className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-mono text-sm font-semibold text-slate-900 truncate">
                          {selectedNode.label}
                        </h3>
                        <span className="text-slate-500 shrink-0">
                          {
                            ARCHITECTURE_LAYERS.find(
                              (l) => l.id === selectedNode.layer
                            )?.title
                          }
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {selectedNode.role}
                        {selectedNode.originalLabel
                          ? ` · Originally ${selectedNode.originalLabel}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    {selectedNode.description}
                  </p>

                  {/* Anomaly / Fix Diagnostic Box with Direct 'Fix' Button */}
                  {selectedNode.originalAnomalyNote && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-medium text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Diagram Audit & Ferrum Fix</span>
                        </div>
                        {unfixedIssueByNodeId.has(selectedNode.id) && (
                          <button
                            type="button"
                            onClick={() => {
                              const issue = unfixedIssueByNodeId.get(
                                selectedNode.id
                              );
                              if (issue) {
                                if (!isRepairMode) {
                                  setIsRepairMode(true);
                                  setFixedIssueIds([issue.id]);
                                } else {
                                  handleFixSingleIssue(issue);
                                }
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                          >
                            Fix Issue
                          </button>
                        )}
                      </div>
                      <p className="text-amber-900/90 leading-relaxed">
                        <strong>Raw Diagram:</strong>{' '}
                        {selectedNode.originalAnomalyNote}
                      </p>
                      {selectedNode.ferrumFixNote && (
                        <p className="text-emerald-900 leading-relaxed">
                          <strong>Ferrum Topology:</strong>{' '}
                          {selectedNode.ferrumFixNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Python Dependencies */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium">
                      Python Runtime Symbols & Interfaces
                    </span>
                    <div className="font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-2.5 py-2">
                      {selectedNode.pythonDependencies.join(' · ')}
                    </div>
                  </div>

                  {/* Upstream & Downstream Adjacency */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block mb-1">
                        Incoming ({nodeConnections.incoming.length})
                      </span>
                      {nodeConnections.incoming.length === 0 ? (
                        <span className="text-slate-400">Source endpoint</span>
                      ) : (
                        <ul className="space-y-1">
                          {nodeConnections.incoming.map((edge) => {
                            const src = ARCHITECTURE_NODES.find(
                              (n) => n.id === edge.source
                            );
                            return (
                              <li key={edge.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedNodeId(edge.source)}
                                  className="font-mono text-[11px] text-sky-700 hover:underline text-left truncate max-w-full cursor-pointer"
                                >
                                  ← {src?.label}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block mb-1">
                        Outgoing ({nodeConnections.outgoing.length})
                      </span>
                      {nodeConnections.outgoing.length === 0 ? (
                        <span className="text-slate-400">Terminal sink</span>
                      ) : (
                        <ul className="space-y-1">
                          {nodeConnections.outgoing.map((edge) => {
                            const tgt = ARCHITECTURE_NODES.find(
                              (n) => n.id === edge.target
                            );
                            return (
                              <li key={edge.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedNodeId(edge.target)}
                                  className="font-mono text-[11px] text-sky-700 hover:underline text-left truncate max-w-full cursor-pointer"
                                >
                                  → {tgt?.label}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Section 2: Anomaly Audit & Repaired Links Table */}
        <section
          id="anomaly-audit-section"
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>01. Structural Diagnostic & Topology Repair Ledger</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Broken Links, Orphaned Modules & Ferrum Architecture Fixes
              </h2>
            </div>

            {/* Interactive Severity Filter */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                'all',
                'Core Rebrand',
                'Critical Orphan',
                'Misrouted Edge',
                'Architectural Bottleneck',
              ].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAuditSeverityFilter(filter)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    auditSeverityFilter === filter
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter === 'all' ? 'All Findings (6)' : filter}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-medium">
                    Finding & Classification
                  </th>
                  <th className="py-3 px-4 font-medium">
                    Raw Diagram Behavior
                  </th>
                  <th className="py-3 px-4 font-medium">
                    Corrected Ferrum Architecture
                  </th>
                  <th className="py-3 pl-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAuditItems.map((item) => {
                  const isHighlighted = highlightedAuditId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isHighlighted ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 pr-4 align-top max-w-xs">
                        <div className="font-semibold text-slate-900">
                          {item.title}
                        </div>
                        <div className="text-slate-500 mt-1">
                          {item.severity} · {item.affectedNodeIds.length} nodes
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-slate-600 max-w-sm leading-relaxed">
                        {item.rawDiagramBehavior}
                      </td>
                      <td className="py-3.5 px-4 align-top text-slate-800 max-w-sm leading-relaxed">
                        {item.correctedFerrumBehavior}
                      </td>
                      <td className="py-3.5 pl-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightedAuditId(item.id);
                            if (item.affectedNodeIds[0]) {
                              setSelectedNodeId(item.affectedNodeIds[0]);
                            }
                            window.scrollTo({top: 0, behavior: 'smooth'});
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer"
                        >
                          Highlight Modules
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Side-by-Side Reference Diagram Comparison */}
        <section
          id="reference-diagram-section"
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span>02. Source Artifact Verification</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Uploaded Reference Diagram vs. Ferrum Architecture
              </h2>
            </div>

            <div className="text-xs text-slate-500">
              <span>Original Entrypoint: </span>
              <code className="font-mono text-slate-700">jarvis.py</code>
              <span className="mx-2" aria-hidden="true">
                →
              </span>
              <span>Rebranded Core: </span>
              <code className="font-mono text-emerald-700 font-semibold">
                ferrum.py
              </code>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-[#F3E8FF]/40 border border-slate-200 rounded-lg p-3 overflow-hidden">
              <div className="relative w-full aspect-[16/9] rounded overflow-hidden bg-slate-100">
                <Image
                  src="/assets/aistudio/diagram_3edcdf07.png"
                  alt="Uploaded Original Architecture Diagram"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4 text-xs">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Layer-by-Layer Summary
              </h3>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {ARCHITECTURE_LAYERS.map((layer) => {
                  const layerNodes = ARCHITECTURE_NODES.filter(
                    (n) => n.layer === layer.id
                  );
                  return (
                    <div key={layer.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between font-medium text-slate-900">
                        <span>
                          {layer.index}. {layer.title}
                        </span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {layerNodes.length} nodes
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {layer.subtitle}
                      </p>
                      <div className="font-mono text-[11px] text-slate-500 pt-0.5">
                        {layerNodes.map((n) => n.label).join(' · ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            Ferrum Architecture Explorer · 5-Layer Voice Assistant System Model
          </span>
          <span>
            Interactive Topology Repair & Step-by-Step Execution Trace Workbench
          </span>
        </div>
      </footer>
    </div>
  );
}
