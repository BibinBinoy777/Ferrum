# Ferrum Architecture Explorer & Flow Simulator

An interactive system architecture workbench and execution flow simulator for the **Ferrum** Python voice assistant architecture. It lets engineers inspect the 5-layer topology (`ferrum.py` Core Engine, User I/O, Module Layer, External Services, and Data & Models), toggle between the raw auto-generated diagram and the corrected Ferrum architecture (fixing broken links and orphaned modules), and step through end-to-end voice command execution traces with real-time packet animations and payload inspection.

### User Review & Critical Decisions

> [!IMPORTANT]
> The plan has been updated to rename the system and core entry point from J.A.R.V.I.S. (`jarvis.py`) to **Ferrum** (`ferrum.py`). Please review the updated plan below and click **Proceed** when ready to build.

- **Confirmed Decision 1 — Rebrand to "Ferrum" (`ferrum.py`)**: All system branding, navigation headers, architectural diagrams, node labels (`ferrum.py`), and voice wake-word simulations ("Hey Ferrum...") use the name **Ferrum**.
- **Confirmed Decision 2 — Interactive Architecture Explorer & Flow Simulator**: Build an interactive architectural canvas paired with a step-by-step execution trace engine rather than a static report.
- **Confirmed Decision 3 — Fix Broken Diagram Links & Orphaned Nodes**: Provide an interactive **Topology Mode Switcher** (`Original Diagram (As-Is)` vs. `Corrected Ferrum Architecture` vs. `Diff Overlay`) that highlights and resolves every broken wire and orphaned node:
  - *Orphaned `Sample generator.py` & `Model Trainer.py`*: Wire the offline enrollment pipeline (`Sample generator.py` → facial dataset → `Model Trainer.py` → writes `trainer.yml` using `haarcascade_frontalface_default.xml`).
  - *Orphaned `Weather API` & `Utilities`*: Connect `Command Parser/Dispatcher` → `Utilities` → `Weather API` for weather/system queries.
  - *Misrouted `amazon.py` → `YouTube` edge*: Re-route `amazon.py` to an external E-Commerce/Web scraping target and connect `youtube.py` & `youtube_downloader.py` properly to the external `YouTube` service.
  - *Misrouted `OCR.py` → `Wikipedia API` edge*: Re-route `OCR.py` to local optical character recognition processing and keep `diction.py` / knowledge queries wired to `Wikipedia API`.
- **Confirmed Decision 4 — Step-by-Step Voice Command Flow Tracing**: Include a deterministic playback controller (`Play`, `Pause`, `Step Forward`, `Step Back`, `Reset`, plus playback speed) to trace concrete Ferrum voice scenarios node-by-node across all 5 layers.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the static voice assistant architecture diagram into the live, inspectable **Ferrum** 5-layer system graph (`ferrum.py` at the core) with an integrated execution trace debugger and side-by-side reference comparison against the uploaded diagram.
- **Target Audience / Persona**: Software architects, students, and developers designing and auditing the **Ferrum** modular Python voice assistant, fixing dependency graph anomalies, and visualizing synchronous I/O-to-API lifecycles.
- **Key Value**: Rebrands the architecture around **Ferrum** (`ferrum.py`), exposes architectural bottlenecks (such as the 10-edge fan-out in `Command Parser/Dispatcher`), repairs diagram routing inaccuracies with clear explanations, and makes voice command data flow tangible step by step.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Ferrum Topology Exploration & Node Inspection**: Users view the 5 horizontal architectural layers (`User I/O Layer`, `Core Engine` anchored by `ferrum.py`, `Module Layer`, `External Services`, `Data & Models`). Clicking any node opens its specification in the right-hand inspector: role in Ferrum, incoming/outgoing connections, architectural health status, and whether it had an anomaly in the original diagram.
  2. **Broken Link & Orphan Diagnostic Mode**: Toggling between `Original (Raw Diagram)`, `Corrected Ferrum Topology`, and `Show Fixes Diff` highlights repaired edges (in emerald with explicit labels) and previously orphaned/miswired edges (in amber/crimson dashed paths with explanations).
  3. **Step-by-Step Ferrum Command Trace Simulation**: Users select a preset Ferrum voice command scenario (e.g., *"Ferrum Startup & Face Authentication"*, *"Fetch Daily News Headlines"*, *"Check Weather Forecast"*, *"Send Email via Voice"*, *"Download YouTube Video"*, or *"Save Persistent Note"*) and step through each hop. As each step executes, the active node and edge illuminate, animated signal pulses travel along the wire, and the inspector displays the exact data payload (audio buffer → recognized string → `ferrum.py` / dispatcher intent → API call/file I/O → `pyttsx3` speech output).
  4. **Reference Diagram Modal / Split View**: Users can inspect the uploaded reference diagram (`/assets/aistudio/diagram_3edcdf07.png`) alongside the interactive Ferrum graph to compare the rebranded and repaired architecture.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Clean architectural blueprint and technical simulation workbench following a Two-Zone Sandbox Layout (65% interactive 5-layer SVG/Canvas stage on the left, 35% control deck and step inspector on the right).
  - *Color Palette & Mood (60-30-10 Budget)*:
    - **60% Dominant Canvas**: Crisp architectural slate-white (`#F8FAFC`) with a subtle blueprint coordinate grid and clearly delineated layer swimlanes matching the diagram's semantic layer colors in refined tones (Sky Blue for User I/O, Emerald for Core Engine / `ferrum.py`, Amber/Orange for Module Layer, Violet for External Services, Neutral Slate for Data & Models).
    - **30% Structural Panels & Axes**: Clean white surface panels (`#FFFFFF`), 1px hairline borders (`#E2E8F0`), and high-contrast slate typography (`#0F172A` primary, `#475569` secondary).
    - **10% Semantic Focal Accents**: Vibrant Azure (`#0284C7`) for active signal trace steps, Emerald (`#059669`) with explicit `repaired link` labels for corrected connections, and Amber/Crimson (`#D97706` / `#DC2626`) with explicit `orphaned` or `misrouted` labels for raw diagram anomalies.
  - *Typography & Hierarchy (2+1 Font Rule)*:
    - **Display / Headings**: `Plus Jakarta Sans` (SemiBold/Bold, `text-wrap: balance`) for Ferrum architectural section headers and layer titles.
    - **Body Prose**: `DM Sans` (Regular/Medium) for node descriptions, architectural critique notes, and flow explanations.
    - **Data, Edge Payloads & Step Timing**: `JetBrains Mono` (`tabular-nums`) for step indices, simulated payload JSON/strings, file names (`ferrum.py`, `trainer.yml`), and fan-out counts.
  - *Component Styling & Layout*:
    - Strict adherence to the **Top Bar Contract**: a single-row header with 3 zones separated by `gap-8` (Zone 1: single-line brand wordmark `Ferrum Architecture`; Zone 2: 4 single-line view navigation links `Interactive Graph`, `Flow Simulator`, `Anomaly Audit`, `Reference Diagram`; Zone 3: 1 primary action button `Run Trace Simulation`).
    - **Zero-Pill Metadata Discipline**: Layer classifications, fan-out counts, and node types are rendered as clean, unboxed inline text separated by `·` bullets—never wrapped in decorative pill badges.
- **Interactive Feedback & Motion**:
  - Smooth SVG path stroke animations showing directional packet movement along wires during simulation playback.
  - Instant ($\le 150\text{ms}$) hover highlighting that dims unrelated nodes and illuminates only the hovered node's direct upstream and downstream dependencies.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Rebranding `jarvis.py` to `ferrum.py` with Provenance Note**
  - *Chosen Approach*: Rename the core orchestrator node to `ferrum.py` and update all wake-word payloads and system titles to **Ferrum**, while noting in the Reference Comparison view that `ferrum.py` replaces `jarvis.py` from the original diagram.
  - *Why*: Gives your project its distinct **Ferrum** identity while preserving complete clarity when comparing against the uploaded diagram image.

- **Decision 2: Custom Coordinate-Mapped SVG Layer Graph vs. Generic Force-Directed Graph**
  - *Chosen Approach*: Deterministic 5-layer hierarchical SVG layout that preserves the exact spatial mental model of the 5-layer architecture while supporting dynamic edge toggling and animated signal packets.
  - *Why*: Force-directed graphs scramble layer hierarchy (`User I/O` at top → `Data & Models` at bottom). A deterministic layered layout keeps every Ferrum module in its recognizable swimlane.

- **Decision 3: Tri-State Topology Switcher (`Original`, `Corrected`, `Diff View`)**
  - *Chosen Approach*: Model every edge with metadata indicating whether it existed in the raw diagram, was misrouted, or was added to resolve an orphan node.
  - *Why*: Lets the user immediately see *what* was broken in the original diagram and *how* the corrected Ferrum architecture resolves it.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Top Bar (3-Zone Navigation)                           │
│  [Ferrum Architecture]      —      [Graph · Simulator · Audit · Reference]   │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                               ▼
┌───────────────────────────────────────────┐   ┌──────────────────────────────┐
│   Left Stage: 5-Layer Interactive Graph   │   │ Right Deck: Control & Trace  │
│  (65% Viewport Width)                     │   │ (35% Viewport Width)         │
│                                           │   │                              │
│  ┌─────────────────────────────────────┐  │   │ ┌──────────────────────────┐ │
│  │ Toolbar: Topology Mode Switcher     │  │   │ │ Ferrum Scenario Picker   │ │
│  │ [Original] [Corrected] [Diff View]  │  │   │ │ & Playback Controls      │ │
│  └─────────────────┬───────────────────┘  │   │ │ [|<] [<] [Play] [>] [>|] │ │
│                    ▼                      │   │ └────────────┬─────────────┘ │
│  ┌─────────────────────────────────────┐  │   │              ▼               │
│  │ SVG Layered Canvas & Edge Renderer  │  │   │ ┌──────────────────────────┐ │
│  │  • Layer 1: User I/O (Mic, Speaker) │  │   │ │ Active Step Payload &    │ │
│  │  • Layer 2: Core Engine (ferrum.py) │◄─┼───┼─┤ State Transition Log     │ │
│  │  • Layer 3: Modules & Auth          │  │   │ └────────────┬─────────────┘ │
│  │  • Layer 4: External Services       │  │   │              ▼               │
│  │  • Layer 5: Data & Models           │  │   │ ┌──────────────────────────┐ │
│  └─────────────────────────────────────┘  │   │ │ Node / Edge Inspector &  │ │
│                                           │   │ │ Anomaly Repair Card      │ │
│  ┌─────────────────────────────────────┐  │   │ └──────────────────────────┘ │
│  │ Anomaly Audit & Reference Image     │  │   └──────────────────────────────┘
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

- **Data Model & State**:
  - `ArchitectureNode`: `{ id, label, originalLabel?, layer, subGroup?, description, inputs, outputs, anomalyStatus: 'nominal' | 'orphaned' | 'bottleneck', anomalyNote?, fixedNote? }` (where `ferrum.py` carries `originalLabel: 'jarvis.py'`).
  - `ArchitectureEdge`: `{ id, source, target, label?, status: 'original' | 'misrouted' | 'repaired', explanation }`
  - `CommandTraceScenario`: `{ id, title, voiceUtterance, requiresCorrectedTopology, steps: TraceStep[] }`
  - `TraceStep`: `{ stepIndex, activeNodeId, activeEdgeId?, layer, actionTitle, payloadSample, stateMutation, durationMs }`

- **Interactive Component & State Mapping**:
  - **Topology Mode Switcher**: Mutates `topologyMode` (`'original' | 'corrected' | 'diff'`). Dynamically filters visible edges, updates node status indicators, and auto-switches to `'corrected'` (with a notification banner) if the user triggers a Ferrum voice scenario that depends on a repaired path (such as Weather API or Face Enrollment).
  - **Playback Controller (`Play/Pause`, `Step Forward/Back`, `Reset`, `Speed 0.5x/1x/2x`)**: Drives `currentStepIndex` via a clean timer hook, highlighting the active node/edge on the SVG canvas and scrolling the step log in sync.
  - **Interactive Node & Edge Selection**: Clicking any node or edge in the SVG canvas selects it into `selectedEntity`, displaying its upstream/downstream adjacency list, Python module responsibilities in Ferrum, and any diagram routing fixes.
  - **Anomaly Audit Table & Reference Diagram View**: Clicking any row in the Anomaly Audit list focuses and pulses the corresponding node/edge on the canvas, or toggles the side-by-side comparison with `/assets/aistudio/diagram_3edcdf07.png`.
