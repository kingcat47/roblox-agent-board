import { memo } from "react";
import styles from "./styles.module.scss";

interface Agent {
  name: string;
  role: string;
  status: string;
  task: string;
  model?: string;
}

interface ProjectInfo {
  name: string;
  phase: string;
  startTime: string;
  tasksDone: number;
  tasksTotal: number;
  agentCount: number;
}

interface RelatedTask {
  name: string;
  meta: string;
  done: boolean;
  failed: boolean;
}

interface NodePopupProps {
  agent?: Agent;
  project?: ProjectInfo;
  relatedTask?: RelatedTask;
  onClose: () => void;
}

function NodePopup({ agent, project, relatedTask, onClose }: NodePopupProps) {
  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.popupClose} onClick={onClose}>×</button>

        {project && (
          <>
            <h3 className={styles.popupTitle}>{project.name}</h3>
            <dl className={styles.popupDl}>
              <dt>상태</dt>
              <dd>{project.phase}</dd>
              <dt>시작</dt>
              <dd>{project.startTime}</dd>
              <dt>진행률</dt>
              <dd>{project.tasksDone} / {project.tasksTotal} 작업 완료</dd>
              <dt>에이전트</dt>
              <dd>{project.agentCount}명 참여중</dd>
            </dl>
            <div className={styles.progressWrap}>
              <div
                className={styles.progressBar}
                style={{ width: `${project.tasksTotal > 0 ? (project.tasksDone / project.tasksTotal) * 100 : 0}%` }}
              />
            </div>
          </>
        )}

        {agent && (
          <>
            <h3 className={styles.popupTitle}>{agent.name}</h3>
            <dl className={styles.popupDl}>
              <dt>역할</dt>
              <dd>{agent.role}</dd>
              <dt>현재 작업</dt>
              <dd>{agent.task || "-"}</dd>
              <dt>상태</dt>
              <dd>{agent.status}</dd>
              {agent.model && (
                <>
                  <dt>모델</dt>
                  <dd>{agent.model}</dd>
                </>
              )}
            </dl>
            {relatedTask && (
              <div className={styles.popupTask}>
                <span className={styles.popupTaskLabel}>연관 작업</span>
                <span className={styles.popupTaskName}>
                  {relatedTask.done ? "✓ " : relatedTask.failed ? "✗ " : ""}
                  {relatedTask.name}
                </span>
                {relatedTask.meta && (
                  <span className={styles.popupTaskMeta}>{relatedTask.meta}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default memo(NodePopup);
