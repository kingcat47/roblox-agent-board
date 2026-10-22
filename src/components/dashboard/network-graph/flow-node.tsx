import { memo } from "react";
import styles from "./styles.module.scss";

export interface FlowNodeProps {
  name: string;
  role: string;
  status: string;
  model?: string;
  isProject?: boolean;
  onClick?: () => void;
}

function getStatusColor(status: string): string {
  if (/완료|done|completed/i.test(status)) return "#34D399";
  if (/진행|작업|running/i.test(status)) return "#60A5FA";
  if (/실패|failed|error/i.test(status)) return "#F87171";
  if (/대기|waiting|pending/i.test(status)) return "#FBBF24";
  return "#818CF8";
}

function getStatusIcon(status: string): string {
  if (/완료|done|completed/i.test(status)) return "✓";
  if (/진행|작업|running/i.test(status)) return "↻";
  if (/실패|failed|error/i.test(status)) return "✗";
  if (/대기|waiting|pending/i.test(status)) return "⏳";
  return "●";
}

function FlowNode({ name, role, status, model, isProject, onClick }: FlowNodeProps) {
  const color = isProject ? "#818CF8" : getStatusColor(status);

  return (
    <div
      className={`${styles.flowNode} ${isProject ? styles.projectNode : ""}`}
      onClick={onClick}
    >
      <div className={styles.nodeHeader}>
        <span className={styles.statusDot} style={{ background: color }} />
        <span className={styles.nodeName}>{name}</span>
      </div>
      <span className={styles.nodeRole}>{role}</span>
      <div className={styles.nodeFooter}>
        {!isProject && status && (
          <span className={styles.statusLine}>
            <span style={{ color }}>{getStatusIcon(status)}</span>
            <span>{status}</span>
          </span>
        )}
        {model && <span className={styles.modelBadge}>{model}</span>}
      </div>
    </div>
  );
}

export default memo(FlowNode);
