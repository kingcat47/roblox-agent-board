import { useEffect, useRef, useState, useMemo } from "react";
import styles from "./styles.module.scss";

interface LogEntry {
  time: string;
  msg: string;
}

function logType(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("실패") || lower.includes("에러")) return styles.error;
  if (lower.includes("완료") || lower.includes("성공")) return styles.success;
  if (lower.includes("시작") || lower.includes("배정") || lower.includes("투입")) return styles.info;
  if (lower.includes("진행") || lower.includes("작업중") || lower.includes("실행") || lower.includes("분석")) return styles.working;
  if (lower.includes("승인") || lower.includes("재시도")) return styles.warning;
  return "";
}

function extractAgent(msg: string): string | null {
  const match = msg.match(/^([\w-]+)/);
  return match ? match[1] : null;
}

export default function LogStream({ logs }: { logs: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

  const agents = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      const a = extractAgent(l.msg);
      if (a) set.add(a);
    });
    return [...set].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    if (unchecked.size === 0) return logs;
    return logs.filter((l) => {
      const a = extractAgent(l.msg);
      return !a || !unchecked.has(a);
    });
  }, [logs, unchecked]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length]);

  const toggle = (agent: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) next.delete(agent);
      else next.add(agent);
      return next;
    });
  };

  if (!logs.length) return <p className={styles.empty}>로그가 아직 없습니다</p>;

  return (
    <div>
      {agents.length > 1 && (
        <div className={styles.filters}>
          {agents.map((a) => (
            <label key={a} className={styles.filterLabel}>
              <input
                type="checkbox"
                checked={!unchecked.has(a)}
                onChange={() => toggle(a)}
                className={styles.filterCheck}
              />
              <span>{a}</span>
            </label>
          ))}
        </div>
      )}
      <div className={styles.container}>
        {filtered.map((l, i) => (
          <div key={i} className={`${styles.entry} ${logType(l.msg)}`}>
            <span className={styles.time}>{l.time}</span>
            <span className={styles.msg}>{l.msg}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
