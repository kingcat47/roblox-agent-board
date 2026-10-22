import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/dashboard/sidebar";
import styles from "./styles.module.scss";

export type ViewType = "overview" | "decisions" | "memory" | "reports" | "guide";

export default function DashboardLayout() {
  const [view, setView] = useState<ViewType>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggleTheme = useCallback(() => setDark((d) => !d), []);

  return (
    <div className={styles.layout}>
      <Sidebar
        current={view}
        onChange={setView}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        dark={dark}
        onThemeToggle={toggleTheme}
      />
      <main className={styles.main}>
        <Outlet context={{ view, setView }} />
      </main>
    </div>
  );
}
