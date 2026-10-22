import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./styles.module.scss";

interface Props {
  content: string;
  title?: string;
}

export default function MarkdownView({ content, title }: Props) {
  if (!content) return <div className={styles.empty}>{title ? `No ${title} yet` : "No content"}</div>;

  return (
    <div className={styles.container}>
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
