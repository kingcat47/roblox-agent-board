import { useState, useMemo, useEffect, useCallback } from "react";
import MarkdownView from "@/components/dashboard/markdown-view";
import styles from "./styles.module.scss";

interface PRFile {
  name: string;
  filename: string;
  content: string;
  mtime: number;
}

interface DirData {
  folders: string[];
  files: PRFile[];
}

interface PRMeta {
  pr: string;
  date: string;
  time: string;
  task: string;
  author: string;
  status: string;
  files: string;
  title: string;
  summary: string;
  decisions: string[];
  fullContent: string;
}

function parsePR(file: PRFile): PRMeta {
  const lines = file.content.split("\n");
  const meta: Record<string, string> = {};
  let title = file.name;
  let summary = "";
  const decisions: string[] = [];
  let inDecisions = false;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace("# ", "").trim();
      continue;
    }

    const metaMatch = line.match(/^- (\w+):\s*(.+)/);
    if (metaMatch) {
      meta[metaMatch[1]] = metaMatch[2].trim();
      continue;
    }

    if (line.startsWith("## 요약")) {
      const idx = lines.indexOf(line);
      const nextLines = [];
      for (let i = idx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("## ")) break;
        if (lines[i].trim()) nextLines.push(lines[i].trim());
      }
      summary = nextLines.join(" ");
      continue;
    }

    if (line.startsWith("## 결정 사항")) {
      inDecisions = true;
      continue;
    }

    if (inDecisions && line.startsWith("### ")) {
      decisions.push(line.replace("### ", "").trim());
    }

    if (inDecisions && line.startsWith("## ") && !line.includes("결정")) {
      inDecisions = false;
    }
  }

  return {
    pr: meta.pr || "?",
    date: meta.date || "",
    time: meta.time || "",
    task: meta.task || "",
    author: meta.author || "",
    status: meta.status || "",
    files: meta.files || "",
    title,
    summary,
    decisions,
    fullContent: file.content,
  };
}

interface PRListProps {
  path: string[];
  onPathChange: (path: string[]) => void;
}

export default function PRList({ path, onPathChange }: PRListProps) {
  const [dirData, setDirData] = useState<DirData>({ folders: [], files: [] });
  const [search, setSearch] = useState("");
  const [openPR, setOpenPR] = useState<string | null>(null);

  const fetchDir = useCallback(async () => {
    try {
      const q = path.length > 0 ? `?path=${encodeURIComponent(path.join("/"))}` : "";
      const res = await fetch(`/api/decisions${q}`);
      const data: DirData = await res.json();
      setDirData(data);
    } catch { /* server not ready */ }
  }, [path]);

  useEffect(() => {
    fetchDir();
    const id = setInterval(fetchDir, 3000);
    return () => clearInterval(id);
  }, [fetchDir]);

  const prs = useMemo(() => dirData.files.map(parsePR).reverse(), [dirData.files]);

  const filtered = useMemo(() => {
    if (!search) return prs;
    const q = search.toLowerCase();
    return prs.filter(
      (pr) =>
        pr.title.toLowerCase().includes(q) ||
        pr.task.toLowerCase().includes(q) ||
        pr.author.toLowerCase().includes(q) ||
        pr.files.toLowerCase().includes(q) ||
        pr.summary.toLowerCase().includes(q) ||
        pr.decisions.some((d) => d.toLowerCase().includes(q))
    );
  }, [prs, search]);

  const navigateTo = (folder: string) => {
    onPathChange([...path, folder]);
    setSearch("");
    setOpenPR(null);
  };

  const navigateBack = () => {
    onPathChange(path.slice(0, -1));
    setSearch("");
    setOpenPR(null);
  };

  // PR detail view
  if (openPR) {
    const pr = prs.find((p) => p.pr === openPR);
    if (!pr) return null;

    return (
      <div>
        <button className={styles.backBtn} onClick={() => setOpenPR(null)}>
          ← 목록으로
        </button>
        <div className={styles.detailHeader}>
          <span className={styles.prNumber}>PR-{pr.pr}</span>
          <h2 className={styles.detailTitle}>{pr.title}</h2>
          <div className={styles.detailMeta}>
            <span>{pr.date} {pr.time}</span>
            <span>·</span>
            <span>{pr.author}</span>
            <span>·</span>
            <span className={`${styles.statusTag} ${styles[pr.status]}`}>{pr.status}</span>
          </div>
          <div className={styles.detailFiles}>
            {pr.files.split(",").map((f) => (
              <code key={f.trim()} className={styles.fileTag}>{f.trim()}</code>
            ))}
          </div>
        </div>
        <div className={styles.detailBody}>
          <MarkdownView content={pr.fullContent.split("\n").filter((l) => !l.match(/^- \w+:/)).join("\n")} />
        </div>
      </div>
    );
  }

  const hasFolders = dirData.folders.length > 0;
  const hasFiles = dirData.files.length > 0;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        {path.length > 0 && (
          <button className={styles.navBackBtn} onClick={navigateBack}>←</button>
        )}
        <button
          className={`${styles.breadcrumbItem} ${path.length === 0 ? styles.breadcrumbCurrent : ""}`}
          onClick={() => onPathChange([])}
        >
          전체
        </button>
        {path.map((seg, i) => (
          <span key={i} className={styles.breadcrumbSep}>
            <span className={styles.breadcrumbSlash}>/</span>
            <button
              className={`${styles.breadcrumbItem} ${i === path.length - 1 ? styles.breadcrumbCurrent : ""}`}
              onClick={() => onPathChange(path.slice(0, i + 1))}
            >
              {seg}
            </button>
          </span>
        ))}
      </nav>

      {/* Folders */}
      {hasFolders && (
        <div className={styles.folderGrid}>
          {dirData.folders.map((folder) => (
            <button
              key={folder}
              className={styles.folderCard}
              onClick={() => navigateTo(folder)}
            >
              <span className={styles.folderIcon}>📁</span>
              <span className={styles.folderName}>{folder}</span>
            </button>
          ))}
        </div>
      )}

      {/* PR files */}
      {hasFiles && (
        <>
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              placeholder="PR 검색 (파일명, 작업, 작성자, 내용...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className={styles.count}>{filtered.length}건</span>
          </div>

          {filtered.length === 0 ? (
            <p className={styles.empty}>
              {search ? `"${search}" 검색 결과가 없습니다` : "등록된 PR이 없습니다"}
            </p>
          ) : (
            <div className={styles.list}>
              {filtered.map((pr) => (
                <button
                  key={pr.pr}
                  className={styles.prCard}
                  onClick={() => setOpenPR(pr.pr)}
                >
                  <div className={styles.prTop}>
                    <span className={styles.prNumber}>PR-{pr.pr}</span>
                    <span className={styles.prTitle}>{pr.title.replace(/^PR-\d+:\s*/, "")}</span>
                    <span className={`${styles.statusTag} ${styles[pr.status]}`}>{pr.status}</span>
                  </div>
                  <p className={styles.prSummary}>{pr.summary}</p>
                  <div className={styles.prBottom}>
                    <span className={styles.prMeta}>{pr.date} {pr.time}</span>
                    <span className={styles.prMeta}>{pr.author}</span>
                    <span className={styles.prMeta}>
                      {pr.decisions.length}건 결정 · {pr.files.split(",").length}개 파일
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!hasFolders && !hasFiles && (
        <p className={styles.empty}>이 폴더에 항목이 없습니다</p>
      )}
    </div>
  );
}
