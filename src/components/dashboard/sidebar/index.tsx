import { LayoutDashboard, FileText, BookOpen, Brain, ScrollText, PanelLeftClose, PanelLeft, Sun, Moon, Gamepad2, Box } from "lucide-react";
import type { ViewType } from "@/components/layout/dashboard";
import styles from "./styles.module.scss";

export type EngineType = "roblox" | "unity";

const NAV_ITEMS: { key: ViewType; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "전체 현황", icon: <LayoutDashboard size={18} /> },
  { key: "decisions", label: "결정 근거", icon: <FileText size={18} /> },
  { key: "memory", label: "메모리", icon: <Brain size={18} /> },
  { key: "reports", label: "보고서", icon: <BookOpen size={18} /> },
  { key: "guide", label: "운영 가이드", icon: <ScrollText size={18} /> },
];

interface Props {
  current: ViewType;
  onChange: (v: ViewType) => void;
  collapsed: boolean;
  onToggle: () => void;
  dark: boolean;
  onThemeToggle: () => void;
  engine: EngineType;
  onEngineChange: (e: EngineType) => void;
}

export default function Sidebar({ current, onChange, collapsed, onToggle, dark, onThemeToggle, engine, onEngineChange }: Props) {
  const toggleEngine = () => onEngineChange(engine === "roblox" ? "unity" : "roblox");

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.header}>
        {!collapsed && <span className={styles.logo}>Agent Dashboard</span>}
        <button className={styles.toggleBtn} onClick={onToggle}>
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`${styles.navItem} ${current === item.key ? styles.active : ""}`}
            onClick={() => onChange(item.key)}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className={styles.footer}>
        <button className={styles.engineBtn} onClick={toggleEngine} title={engine === "roblox" ? "Roblox" : "Unity"}>
          {engine === "roblox" ? <Gamepad2 size={18} /> : <Box size={18} />}
          {!collapsed && <span>{engine === "roblox" ? "Roblox" : "Unity"}</span>}
        </button>
        <button className={styles.themeBtn} onClick={onThemeToggle} title={dark ? "라이트 모드" : "다크 모드"}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{dark ? "라이트 모드" : "다크 모드"}</span>}
        </button>
      </div>
    </aside>
  );
}
