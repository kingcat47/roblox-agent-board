import { useState, useEffect, useCallback } from "react";
import MarkdownView from "@/components/dashboard/markdown-view";
import styles from "./styles.module.scss";

interface FileEntry {
  name: string;
  filename: string;
  content: string;
  mtime: number;
}

interface DirData {
  folders: string[];
  files: FileEntry[];
}

interface Props {
  endpoint: string;
  path: string[];
  onPathChange: (path: string[]) => void;
}

export default function FolderBrowser({ endpoint, path, onPathChange }: Props) {
  const [dirData, setDirData] = useState<DirData>({ folders: [], files: [] });

  const fetchDir = useCallback(async () => {
    try {
      const q = path.length > 0 ? `?path=${encodeURIComponent(path.join("/"))}` : "";
      const res = await fetch(`${endpoint}${q}`);
      const data: DirData = await res.json();
      setDirData(data);
    } catch { /* server not ready */ }
  }, [endpoint, path]);

  useEffect(() => {
    fetchDir();
    const id = setInterval(fetchDir, 3000);
    return () => clearInterval(id);
  }, [fetchDir]);

  const hasFolders = dirData.folders.length > 0;
  const hasFiles = dirData.files.length > 0;

  return (
    <div>
      <nav className={styles.breadcrumb}>
        {path.length > 0 && (
          <button className={styles.backBtn} onClick={() => onPathChange(path.slice(0, -1))}>←</button>
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

      {hasFolders && (
        <div className={styles.folderGrid}>
          {dirData.folders.map((folder) => (
            <button key={folder} className={styles.folderCard} onClick={() => onPathChange([...path, folder])}>
              <span className={styles.folderIcon}>📁</span>
              <span className={styles.folderName}>{folder}</span>
            </button>
          ))}
        </div>
      )}

      {hasFiles && (
        <div className={styles.fileList}>
          {dirData.files.map((f) => (
            <div key={f.name} className={styles.fileCard}>
              <div className={styles.fileHeader}>{f.filename}</div>
              <MarkdownView content={f.content} />
            </div>
          ))}
        </div>
      )}

      {!hasFolders && !hasFiles && (
        <p className={styles.empty}>이 폴더에 항목이 없습니다</p>
      )}
    </div>
  );
}
