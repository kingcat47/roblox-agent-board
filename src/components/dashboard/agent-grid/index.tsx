import styles from "./styles.module.scss";

interface Agent {
  name: string;
  role: string;
  status: string;
  task: string;
}

function statusKey(s: string): string {
  const lower = s.toLowerCase();
  if (lower.includes("완료")) return "completed";
  if (lower.includes("진행") || lower.includes("실행")) return "running";
  if (lower.includes("실패")) return "failed";
  if (lower.includes("재시도")) return "retrying";
  if (lower.includes("대기")) return "waiting";
  return "idle";
}

const STATUS_STYLE: Record<string, string> = {
  completed: styles.completed,
  running: styles.running,
  failed: styles.failed,
  retrying: styles.retrying,
  waiting: styles.waiting,
  idle: styles.idle,
};

const BADGE_STYLE: Record<string, string> = {
  completed: styles.badgeCompleted,
  running: styles.badgeRunning,
  failed: styles.badgeFailed,
  retrying: styles.badgeRetrying,
  waiting: styles.badgeWaiting,
  idle: styles.badgeIdle,
};

function roleEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("lead")) return "🎯";
  if (n.includes("scout")) return "🔍";
  if (n.includes("architect")) return "📐";
  if (n.includes("worker")) return "⛏️";
  if (n.includes("reviewer")) return "📋";
  return "🤖";
}

export default function AgentGrid({ agents }: { agents: Agent[] }) {
  if (!agents.length) return <p className={styles.empty}>아직 활성화된 에이전트가 없습니다</p>;

  return (
    <div className={styles.list}>
      {agents.map((a) => {
        const key = statusKey(a.status);
        return (
          <div key={a.name} className={`${styles.card} ${STATUS_STYLE[key]}`}>
            <span className={styles.emoji}>{roleEmoji(a.name)}</span>
            <span className={styles.name}>{a.name}</span>
            <span className={styles.role}>{a.role}</span>
            {a.task && a.task !== "-" && <span className={styles.task}>{a.task}</span>}
            <span className={`${styles.badge} ${BADGE_STYLE[key]}`}>{a.status}</span>
          </div>
        );
      })}
    </div>
  );
}
