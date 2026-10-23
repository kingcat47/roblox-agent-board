import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { parseBoard } from "@/hooks/useAgentData";
import AgentGrid from "@/components/dashboard/agent-grid";
import LogStream from "@/components/dashboard/log-stream";
import MarkdownView from "@/components/dashboard/markdown-view";
import NetworkGraph from "@/components/dashboard/network-graph";
import type { ViewType } from "@/components/layout/dashboard";
import type { EngineType } from "@/components/dashboard/sidebar";
import styles from "./Dashboard.module.scss";

interface DirData {
  folders: string[];
  files: { name: string; filename: string; content: string; mtime: number }[];
}

interface PRMeta {
  pr: string; date: string; time: string; task: string;
  author: string; status: string; files: string; title: string;
  summary: string; decisions: string[]; fullContent: string;
}

function parsePR(file: DirData["files"][0]): PRMeta {
  const lines = file.content.split("\n");
  const meta: Record<string, string> = {};
  let title = file.name;
  let summary = "";
  const decisions: string[] = [];
  let inDecisions = false;

  for (const line of lines) {
    if (line.startsWith("# ")) { title = line.replace("# ", "").trim(); continue; }
    const m = line.match(/^- (\w+):\s*(.+)/);
    if (m) { meta[m[1]] = m[2].trim(); continue; }
    if (line.startsWith("## 요약")) {
      const idx = lines.indexOf(line);
      const nl: string[] = [];
      for (let i = idx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("## ")) break;
        if (lines[i].trim()) nl.push(lines[i].trim());
      }
      summary = nl.join(" "); continue;
    }
    if (line.startsWith("## 결정 사항")) { inDecisions = true; continue; }
    if (inDecisions && line.startsWith("### ")) decisions.push(line.replace("### ", "").trim());
    if (inDecisions && line.startsWith("## ") && !line.includes("결정")) inDecisions = false;
  }

  return {
    pr: meta.pr || "?", date: meta.date || "", time: meta.time || "",
    task: meta.task || "", author: meta.author || "", status: meta.status || "",
    files: meta.files || "", title, summary, decisions, fullContent: file.content,
  };
}

// ── Shared hooks ──

function useDirData(endpoint: string, path: string[], extraParams?: Record<string, string>) {
  const [data, setData] = useState<DirData>({ folders: [], files: [] });
  const extraKey = extraParams ? JSON.stringify(extraParams) : "";
  const fetchDir = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (path.length > 0) params.set("path", path.join("/"));
      if (extraParams) Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
      const q = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${endpoint}${q}`);
      setData(await res.json());
    } catch { /* */ }
  }, [endpoint, path, extraKey]);

  useEffect(() => {
    fetchDir();
    const id = setInterval(fetchDir, 2000);
    return () => clearInterval(id);
  }, [fetchDir]);

  return data;
}

// ── Tab Views (no folder nav, just content at current path) ──

function OverviewContent({ path, engine }: { path: string[]; engine: EngineType }) {
  const { files } = useDirData("/api/boards", path, { engine });
  const boardFile = files.find((f) => f.filename === "board.md");
  const board = useMemo(() => (boardFile ? parseBoard(boardFile.content) : null), [boardFile]);

  if (!board) return <p className={styles.emptyState}>이 경로에 작업 보드가 없습니다</p>;

  return (
    <>
      <div className={styles.section}>
        <NetworkGraph
          projectName={board.taskName}
          phase={board.phase}
          agents={board.agents}
          tasks={board.tasks}
          projectInfo={{
            name: board.taskName, phase: board.phase, startTime: board.startTime,
            tasksDone: board.tasks.filter((t) => t.done).length,
            tasksTotal: board.tasks.length, agentCount: board.agents.length,
          }}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionHeader}>에이전트</h3>
        <AgentGrid agents={board.agents} />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionHeader}>로그</h3>
        <div className={styles.sectionBody}>
          <LogStream logs={board.logs} />
        </div>
      </div>
    </>
  );
}

function DecisionsContent({ path }: { path: string[] }) {
  const { files } = useDirData("/api/decisions", path);
  const [search, setSearch] = useState("");
  const [openPR, setOpenPR] = useState<string | null>(null);

  const prs = useMemo(() => files.map(parsePR).reverse(), [files]);
  const filtered = useMemo(() => {
    if (!search) return prs;
    const q = search.toLowerCase();
    return prs.filter((pr) =>
      pr.title.toLowerCase().includes(q) || pr.task.toLowerCase().includes(q) ||
      pr.author.toLowerCase().includes(q) || pr.files.toLowerCase().includes(q) ||
      pr.summary.toLowerCase().includes(q) || pr.decisions.some((d) => d.toLowerCase().includes(q))
    );
  }, [prs, search]);

  if (openPR) {
    const pr = prs.find((p) => p.pr === openPR);
    if (!pr) return null;
    return (
      <div>
        <button className={styles.textBtn} onClick={() => setOpenPR(null)}>← 목록으로</button>
        <div className={styles.prDetailHeader}>
          <span className={styles.prNumber}>PR-{pr.pr}</span>
          <h2 className={styles.prDetailTitle}>{pr.title}</h2>
          <div className={styles.prDetailMeta}>
            <span>{pr.date} {pr.time}</span><span>·</span><span>{pr.author}</span>
            <span>·</span><span className={`${styles.statusTag} ${styles[pr.status]}`}>{pr.status}</span>
          </div>
          <div className={styles.prDetailFiles}>
            {pr.files.split(",").map((f) => <code key={f.trim()} className={styles.fileTag}>{f.trim()}</code>)}
          </div>
        </div>
        <div className={styles.sectionBody}>
          <MarkdownView content={pr.fullContent.split("\n").filter((l) => !l.match(/^- \w+:/)).join("\n")} />
        </div>
      </div>
    );
  }

  if (prs.length === 0) return <p className={styles.emptyState}>이 경로에 결정 근거가 없습니다</p>;

  return (
    <>
      <div className={styles.searchBar}>
        <input className={styles.searchInput} placeholder="PR 검색..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className={styles.searchCount}>{filtered.length}건</span>
      </div>
      <div className={styles.prList}>
        {filtered.map((pr) => (
          <button key={pr.pr} className={styles.prCard} onClick={() => setOpenPR(pr.pr)}>
            <div className={styles.prTop}>
              <span className={styles.prNumber}>PR-{pr.pr}</span>
              <span className={styles.prTitle}>{pr.title.replace(/^PR-\d+:\s*/, "")}</span>
              <span className={`${styles.statusTag} ${styles[pr.status]}`}>{pr.status}</span>
            </div>
            <p className={styles.prSummary}>{pr.summary}</p>
            <div className={styles.prBottom}>
              <span className={styles.prMeta}>{pr.date} {pr.time}</span>
              <span className={styles.prMeta}>{pr.author}</span>
              <span className={styles.prMeta}>{pr.decisions.length}건 결정 · {pr.files.split(",").length}개 파일</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function GuideContent({ engine }: { engine: EngineType }) {
  const [content, setContent] = useState("");
  const [exists, setExists] = useState(false);

  useEffect(() => {
    fetch(`/api/guide?engine=${engine}`)
      .then((r) => r.json())
      .then((data) => { setContent(data.content || ""); setExists(data.exists); })
      .catch(() => {});
  }, [engine]);

  if (!exists) return <p className={styles.emptyState}>운영 가이드 파일을 찾을 수 없습니다</p>;

  return (
    <div className={styles.mdFileCard}>
      <div className={styles.mdFileHeader}>{engine}-dev.md</div>
      <MarkdownView content={content} />
    </div>
  );
}

function MarkdownContent({ endpoint, path }: { endpoint: string; path: string[] }) {
  const { files } = useDirData(endpoint, path);

  if (files.length === 0) return <p className={styles.emptyState}>이 경로에 파일이 없습니다</p>;

  return (
    <div className={styles.mdFileList}>
      {files.map((f) => (
        <div key={f.name} className={styles.mdFileCard}>
          <div className={styles.mdFileHeader}>{f.filename}</div>
          <MarkdownView content={f.content} />
        </div>
      ))}
    </div>
  );
}

// ── Tab labels ──

const TAB_TITLES: Record<ViewType, string> = {
  overview: "전체 현황",
  decisions: "결정 근거",
  memory: "메모리",
  reports: "보고서",
  guide: "운영 가이드",
};

// ── Dashboard (shared path + folder nav) ──

export default function Dashboard() {
  const { view, engine } = useOutletContext<{ view: ViewType; engine: EngineType }>();
  const [path, setPath] = useState<string[]>([]);

  // Reset path when engine changes
  useEffect(() => { setPath([]); }, [engine]);

  // Folder structure from boards (canonical source)
  const boardsDir = useDirData("/api/boards", path, { engine });
  const hasFolders = boardsDir.folders.length > 0;
  const hasBoardFile = boardsDir.files.some((f) => f.filename === "board.md");

  // Approvals from ALL boards (shown globally on all tabs)
  const [approvals, setApprovals] = useState<{ text: string; path: string }[]>([]);
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const res = await fetch("/api/approvals");
        setApprovals(await res.json());
      } catch { /* */ }
    };
    fetchApprovals();
    const id = setInterval(fetchApprovals, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {approvals.length > 0 && (
        <div className={styles.approvalStack}>
          {approvals.map((a, i) => (
            <div key={i} className={styles.approvalCard}>
              <span className={styles.approvalDot} />
              <div className={styles.approvalBody}>
                <span className={styles.approvalPath}>{a.path}</span>
                <span className={styles.approvalText}>{a.text.replace(/^⚠️?\s*/, "")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className={styles.pageTitle}>{TAB_TITLES[view]}</h2>

      {view === "guide" ? (
        <GuideContent engine={engine} />
      ) : (
        <>
          <nav className={styles.breadcrumb}>
            {path.length > 0 && (
              <button className={styles.backBtn} onClick={() => setPath((p) => p.slice(0, -1))}>←</button>
            )}
            <button
              className={`${styles.breadcrumbItem} ${path.length === 0 ? styles.breadcrumbCurrent : ""}`}
              onClick={() => setPath([])}
            >
              전체
            </button>
            {path.map((seg, i) => (
              <span key={i}>
                <span className={styles.breadcrumbSlash}>/</span>
                <button
                  className={`${styles.breadcrumbItem} ${i === path.length - 1 ? styles.breadcrumbCurrent : ""}`}
                  onClick={() => setPath((p) => p.slice(0, i + 1))}
                >
                  {seg}
                </button>
              </span>
            ))}
          </nav>

          {hasFolders && (
            <div className={styles.folderGrid}>
              {boardsDir.folders.map((folder) => (
                <button key={folder} className={styles.folderCard} onClick={() => setPath((p) => [...p, folder])}>
                  <span className={styles.folderIcon}>📁</span>
                  <span className={styles.folderName}>{folder}</span>
                </button>
              ))}
            </div>
          )}

          {(hasBoardFile || !hasFolders) && (
            <>
              {view === "overview" && <OverviewContent path={path} engine={engine} />}
              {view === "decisions" && <DecisionsContent path={path} />}
              {view === "memory" && <MarkdownContent endpoint="/api/memory" path={path} />}
              {view === "reports" && <MarkdownContent endpoint="/api/reports" path={path} />}
            </>
          )}
        </>
      )}
    </>
  );
}
