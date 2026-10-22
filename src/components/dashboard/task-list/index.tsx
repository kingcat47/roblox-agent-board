import styles from "./styles.module.scss";

interface Task {
  name: string;
  meta: string;
  done: boolean;
  failed: boolean;
}

export default function TaskList({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <p className={styles.empty}>등록된 작업이 없습니다</p>;

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div>
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
        </div>
        <span className={styles.progressText}>{doneCount}/{tasks.length}</span>
      </div>
      <ul className={styles.list}>
        {tasks.map((t, i) => (
          <li key={i} className={`${styles.item} ${t.done ? styles.done : t.failed ? styles.fail : ""}`}>
            <span className={styles.name}>{t.name}</span>
            <span className={styles.meta}>{t.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
