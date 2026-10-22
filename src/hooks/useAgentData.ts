import { useState, useEffect, useCallback } from "react";

interface MdFile {
  content: string;
  exists: boolean;
  mtime?: number;
}

interface FileEntry {
  name: string;
  filename: string;
  content: string;
  mtime: number;
}

interface BoardData {
  phase: string;
  taskName: string;
  startTime: string;
  agents: { name: string; role: string; status: string; task: string; model?: string }[];
  tasks: { name: string; meta: string; done: boolean; failed: boolean }[];
  approvals: string[];
  logs: { time: string; msg: string }[];
}

export function parseBoard(content: string): BoardData {
  const result: BoardData = {
    phase: "",
    taskName: "",
    startTime: "",
    agents: [],
    tasks: [],
    approvals: [],
    logs: [],
  };
  if (!content) return result;

  const lines = content.split("\n");
  let section = "";

  for (const line of lines) {
    if (line.includes("현재 작업:")) {
      const m = line.match(/현재 작업:\s*(.+)/);
      if (m) result.taskName = m[1].trim();
    }
    if (line.includes("시작:") && !section) {
      const m = line.match(/시작:\s*(.+)/);
      if (m) result.startTime = m[1].trim();
    }
    if (line.includes("상태:") && !section) {
      const m = line.match(/상태:\s*(.+)/);
      if (m) result.phase = m[1].trim();
    }

    if (line.includes("## 에이전트 현황")) { section = "agents"; continue; }
    if (line.includes("## 작업 목록")) { section = "tasks"; continue; }
    if (line.includes("## 승인 대기")) { section = "approvals"; continue; }
    if (line.includes("## 로그")) { section = "logs"; continue; }
    if (line.startsWith("## ") && section) { section = ""; continue; }

    if (section === "agents" && line.startsWith("|") && !line.includes("---") && !line.includes("에이전트")) {
      const cols = line.split("|").map((s) => s.trim()).filter(Boolean);
      if (cols.length >= 4) {
        result.agents.push({ name: cols[0], role: cols[1], status: cols[2], task: cols[3], model: cols[4] || undefined });
      }
    }

    if (section === "tasks" && line.match(/^- \[/)) {
      const done = line.includes("[x]");
      const m = line.match(/^- \[.\]\s*(.+)/);
      if (m) {
        const parts = m[1].split("(");
        const name = parts[0].trim();
        const meta = parts[1] ? parts[1].replace(")", "").trim() : "";
        const failed = meta.includes("실패");
        result.tasks.push({ name, meta, done, failed });
      }
    }

    if (section === "approvals" && line.startsWith("- ")) {
      result.approvals.push(line.substring(2).trim());
    }

    if (section === "logs" && line.startsWith("- ")) {
      const m = line.substring(2).match(/\[(.+?)]\s*(.+)/);
      if (m) result.logs.push({ time: m[1], msg: m[2] });
    }
  }

  return result;
}

export function useBoard(interval = 2000) {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [raw, setRaw] = useState("");

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/board");
      const data: MdFile = await res.json();
      if (data.exists) {
        setRaw(data.content);
        setBoard(parseBoard(data.content));
      }
    } catch { /* server not ready */ }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, interval);
    return () => clearInterval(id);
  }, [fetch_, interval]);

  return { board, raw };
}

export function useMdFile(endpoint: string, interval = 3000) {
  const [content, setContent] = useState("");
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(endpoint);
        const data: MdFile = await res.json();
        setContent(data.content);
        setExists(data.exists);
      } catch { /* */ }
    };
    fetch_();
    const id = setInterval(fetch_, interval);
    return () => clearInterval(id);
  }, [endpoint, interval]);

  return { content, exists };
}

export function useFileList(endpoint: string, interval = 3000) {
  const [files, setFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        setFiles(data.files || []);
      } catch { /* */ }
    };
    fetch_();
    const id = setInterval(fetch_, interval);
    return () => clearInterval(id);
  }, [endpoint, interval]);

  return files;
}
