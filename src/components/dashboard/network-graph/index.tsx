import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import FlowNode from "./flow-node";
import NodePopup from "./node-popup";
import styles from "./styles.module.scss";

interface Agent {
  name: string;
  role: string;
  status: string;
  task: string;
  model?: string;
}

interface Task {
  name: string;
  meta: string;
  done: boolean;
  failed: boolean;
}

interface ProjectInfo {
  name: string;
  phase: string;
  startTime: string;
  tasksDone: number;
  tasksTotal: number;
  agentCount: number;
}

interface Props {
  projectName: string;
  phase?: string;
  agents: Agent[];
  tasks: Task[];
  projectInfo?: ProjectInfo;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  name: string;
  role: string;
  status: string;
  task: string;
  model?: string;
  isProject?: boolean;
}

const NODE_W = 220;
const NODE_H = 104;
const COL_GAP = 100;
const ROW_GAP = 28;

const PHASE_ORDER = [/^lead/i, /^scout/i, /^architect/i, /^worker/i, /^reviewer/i];

function groupAgents(agents: Agent[]): Agent[][] {
  const groups = new Map<number, Agent[]>();
  const other: Agent[] = [];
  agents.forEach((a) => {
    const idx = PHASE_ORDER.findIndex((re) => re.test(a.name));
    if (idx >= 0) {
      if (!groups.has(idx)) groups.set(idx, []);
      groups.get(idx)!.push(a);
    } else {
      other.push(a);
    }
  });
  const result: Agent[][] = [];
  [...groups.keys()].sort((a, b) => a - b).forEach((k) => {
    result.push(groups.get(k)!);
  });
  if (other.length > 0) result.push(other);
  return result;
}

function findRelatedTask(agentTask: string, tasks: Task[]) {
  if (!agentTask || agentTask === "-") return undefined;
  const aWords = agentTask.replace(/[^\w가-힣\s]/g, "").split(/\s+/).filter((w) => w.length >= 2);
  return tasks.find((t) => {
    const tWords = t.name.replace(/[^\w가-힣\s]/g, "").split(/\s+/);
    return aWords.some((aw) => tWords.some((tw) => tw.includes(aw) || aw.includes(tw)));
  });
}

export default function NetworkGraph({ projectName, phase, agents, tasks, projectInfo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState({ panX: 0, panY: 0, zoom: 1 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragDist = useRef(0);
  const currentPan = useRef({ x: 0, y: 0 });
  const hasFitted = useRef(false);
  const [selected, setSelected] = useState<LayoutNode | null>(null);

  // Layout
  const { allNodes, edgePaths } = useMemo(() => {
    const groups = groupAgents(agents);
    const columns: LayoutNode[][] = [];

    columns.push([{
      id: "project", name: projectName || "프로젝트", role: phase || "",
      status: "", task: "", isProject: true, x: 0, y: 0,
    }]);

    groups.forEach((group) => {
      columns.push(group.map((a) => ({
        id: `agent-${a.name}`, name: a.name, role: a.role,
        status: a.status, task: a.task, model: a.model, x: 0, y: 0,
      })));
    });

    const maxRows = Math.max(...columns.map((c) => c.length));
    const totalH = maxRows * NODE_H + Math.max(maxRows - 1, 0) * ROW_GAP;

    const allNodes: LayoutNode[] = [];
    columns.forEach((col, ci) => {
      const x = ci * (NODE_W + COL_GAP);
      const colH = col.length * NODE_H + (col.length - 1) * ROW_GAP;
      const startY = (totalH - colH) / 2;
      col.forEach((node, ni) => {
        node.x = x;
        node.y = startY + ni * (NODE_H + ROW_GAP);
        allNodes.push(node);
      });
    });

    const edgePaths: string[] = [];
    for (let ci = 0; ci < columns.length - 1; ci++) {
      const src = columns[ci];
      const dst = columns[ci + 1];
      const busX = Math.round(ci * (NODE_W + COL_GAP) + NODE_W + COL_GAP / 2);

      src.forEach((n) => {
        const y = Math.round(n.y + NODE_H / 2);
        edgePaths.push(`M${n.x + NODE_W},${y} H${busX}`);
      });

      const ys = [...src, ...dst].map((n) => Math.round(n.y + NODE_H / 2));
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      if (minY !== maxY) edgePaths.push(`M${busX},${minY} V${maxY}`);

      dst.forEach((n) => {
        const y = Math.round(n.y + NODE_H / 2);
        edgePaths.push(`M${busX},${y} H${n.x}`);
      });
    }

    return { allNodes, edgePaths };
  }, [projectName, phase, agents, tasks]);

  // Fit to view
  const fitToView = useCallback(() => {
    if (!containerRef.current || allNodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pad = 80;

    const minX = Math.min(...allNodes.map((n) => n.x));
    const maxX = Math.max(...allNodes.map((n) => n.x + NODE_W));
    const minY = Math.min(...allNodes.map((n) => n.y));
    const maxY = Math.max(...allNodes.map((n) => n.y + NODE_H));

    const cw = maxX - minX;
    const ch = maxY - minY;
    const sx = (rect.width - pad * 2) / cw;
    const sy = (rect.height - pad * 2) / ch;
    const z = Math.min(sx, sy, 1.4);

    const px = rect.width / 2 - ((minX + maxX) / 2) * z;
    const py = rect.height / 2 - ((minY + maxY) / 2) * z;

    currentPan.current = { x: px, y: py };
    setViewState({ panX: px, panY: py, zoom: z });
  }, [allNodes]);

  // Auto-fit on first load
  useEffect(() => {
    if (!hasFitted.current && allNodes.length > 0) {
      fitToView();
      hasFitted.current = true;
    }
  }, [allNodes, fitToView]);

  // Drag handlers (global listeners for reliability)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragDist.current = 0;
    dragStart.current = { x: e.clientX - currentPan.current.x, y: e.clientY - currentPan.current.y };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const nx = e.clientX - dragStart.current.x;
      const ny = e.clientY - dragStart.current.y;
      dragDist.current += Math.abs(nx - currentPan.current.x) + Math.abs(ny - currentPan.current.y);
      currentPan.current = { x: nx, y: ny };
      setViewState((prev) => ({ ...prev, panX: nx, panY: ny }));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Zoom (wheel) centered on cursor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setViewState((prev) => {
        const nz = Math.min(Math.max(prev.zoom * factor, 0.25), 2.5);
        const r = nz / prev.zoom;
        const px = mx - r * (mx - prev.panX);
        const py = my - r * (my - prev.panY);
        currentPan.current = { x: px, y: py };
        return { panX: px, panY: py, zoom: nz };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setViewState((prev) => {
      if (!containerRef.current) return prev;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = rect.width / 2;
      const my = rect.height / 2;
      const nz = Math.min(Math.max(prev.zoom * factor, 0.25), 2.5);
      const r = nz / prev.zoom;
      const px = mx - r * (mx - prev.panX);
      const py = my - r * (my - prev.panY);
      currentPan.current = { x: px, y: py };
      return { panX: px, panY: py, zoom: nz };
    });
  }, []);

  const handleNodeClick = useCallback((node: LayoutNode) => {
    if (dragDist.current > 5) return;
    setSelected(node);
  }, []);

  if (agents.length === 0) {
    return <div className={styles.canvasEmpty}>활성화된 에이전트가 없습니다</div>;
  }

  const { panX, panY, zoom } = viewState;

  return (
    <div
      ref={containerRef}
      className={styles.canvas}
      style={{ backgroundPosition: `${panX % 24}px ${panY % 24}px` }}
      onMouseDown={handleMouseDown}
    >
      <svg className={styles.svg}>
        <g transform={`translate(${panX},${panY}) scale(${zoom})`}>
          {edgePaths.map((d, i) => (
            <path key={i} d={d} className={styles.edge} />
          ))}
          {allNodes.map((n) => (
            <foreignObject key={n.id} x={n.x} y={n.y} width={NODE_W} height={NODE_H}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: "100%", height: "100%" }}>
                <FlowNode
                  name={n.name}
                  role={n.role}
                  status={n.status}
                  model={n.model}
                  isProject={n.isProject}
                  onClick={() => handleNodeClick(n)}
                />
              </div>
            </foreignObject>
          ))}
        </g>
      </svg>

      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={() => zoomBy(1.25)}>+</button>
        <button className={styles.controlBtn} onClick={() => zoomBy(0.8)}>−</button>
        <button className={styles.controlBtn} onClick={fitToView}>⊞</button>
      </div>

      {selected && (
        selected.isProject && projectInfo ? (
          <NodePopup
            project={projectInfo}
            onClose={() => setSelected(null)}
          />
        ) : (
          <NodePopup
            agent={{ name: selected.name, role: selected.role, status: selected.status, task: selected.task, model: selected.model }}
            relatedTask={findRelatedTask(selected.task, tasks)}
            onClose={() => setSelected(null)}
          />
        )
      )}
    </div>
  );
}
