const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const AGENTS_DIR = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve("./.agents");
const PORT = process.argv[3] || 4000;

const app = express();
app.use(cors());

function readMd(filepath) {
  if (!fs.existsSync(filepath)) return { content: "", exists: false };
  return {
    content: fs.readFileSync(filepath, "utf-8"),
    exists: true,
    mtime: fs.statSync(filepath).mtimeMs,
  };
}

function readDir(dirpath) {
  if (!fs.existsSync(dirpath)) return [];
  return fs
    .readdirSync(dirpath)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({
      name: f.replace(".md", ""),
      filename: f,
      content: fs.readFileSync(path.join(dirpath, f), "utf-8"),
      mtime: fs.statSync(path.join(dirpath, f)).mtimeMs,
    }));
}

app.get("/api/board", (_, res) => {
  res.json(readMd(path.join(AGENTS_DIR, "board.md")));
});

app.get("/api/decisions", (req, res) => {
  const subpath = (req.query.path || "").replace(/\.\./g, "");
  const dirPath = path.join(AGENTS_DIR, "decisions", subpath);

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    res.json({ folders: [], files: [] });
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({
      name: e.name.replace(".md", ""),
      filename: e.name,
      content: fs.readFileSync(path.join(dirPath, e.name), "utf-8"),
      mtime: fs.statSync(path.join(dirPath, e.name)).mtimeMs,
    }));

  res.json({ folders, files });
});

app.get("/api/tasks", (_, res) => {
  res.json({ files: readDir(path.join(AGENTS_DIR, "tasks")) });
});

app.get("/api/handoffs", (_, res) => {
  res.json({ files: readDir(path.join(AGENTS_DIR, "handoffs")) });
});

app.get("/api/memory", (req, res) => {
  const subpath = (req.query.path || "").replace(/\.\./g, "");
  const dirPath = path.join(AGENTS_DIR, "memory", subpath);

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    res.json({ folders: [], files: [] });
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({
      name: e.name.replace(".md", ""),
      filename: e.name,
      content: fs.readFileSync(path.join(dirPath, e.name), "utf-8"),
      mtime: fs.statSync(path.join(dirPath, e.name)).mtimeMs,
    }));

  res.json({ folders, files });
});

app.get("/api/reports", (req, res) => {
  const subpath = (req.query.path || "").replace(/\.\./g, "");
  const dirPath = path.join(AGENTS_DIR, "reports", subpath);

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    res.json({ folders: [], files: [] });
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({
      name: e.name.replace(".md", ""),
      filename: e.name,
      content: fs.readFileSync(path.join(dirPath, e.name), "utf-8"),
      mtime: fs.statSync(path.join(dirPath, e.name)).mtimeMs,
    }));

  res.json({ folders, files });
});

// Check if a directory contains any board.md with matching engine (recursive)
function hasEngine(dir, engine) {
  if (!fs.existsSync(dir)) return false;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && hasEngine(full, engine)) return true;
    if (e.name === "board.md") {
      const content = fs.readFileSync(full, "utf-8");
      const m = content.match(/엔진:\s*(.+)/);
      const boardEngine = m ? m[1].trim().toLowerCase() : "";
      if (!engine || boardEngine === engine.toLowerCase()) return true;
    }
  }
  return false;
}

app.get("/api/boards", (req, res) => {
  const subpath = (req.query.path || "").replace(/\.\./g, "");
  const engine = (req.query.engine || "").toLowerCase();
  const dirPath = path.join(AGENTS_DIR, "boards", subpath);

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    res.json({ folders: [], files: [] });
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  // Filter folders by engine if specified
  if (engine) {
    folders = folders.filter((f) => hasEngine(path.join(dirPath, f), engine));
  }

  let files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({
      name: e.name.replace(".md", ""),
      filename: e.name,
      content: fs.readFileSync(path.join(dirPath, e.name), "utf-8"),
      mtime: fs.statSync(path.join(dirPath, e.name)).mtimeMs,
    }));

  // Filter board files by engine if specified
  if (engine) {
    files = files.filter((f) => {
      const m = f.content.match(/엔진:\s*(.+)/);
      return m && m[1].trim().toLowerCase() === engine;
    });
  }

  res.json({ folders, files });
});

// Scan ALL board.md files recursively for 승인 대기 items
function findAllApprovals(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function walk(d, rel) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(full, rel ? `${rel}/${e.name}` : e.name);
      } else if (e.name === "board.md") {
        const content = fs.readFileSync(full, "utf-8");
        const lines = content.split("\n");
        let inApproval = false;
        for (const line of lines) {
          if (line.startsWith("## 승인 대기")) { inApproval = true; continue; }
          if (inApproval && line.startsWith("## ")) break;
          if (inApproval && line.trim().startsWith("- ")) {
            results.push({ text: line.trim().replace(/^-\s*/, ""), path: rel || "" });
          }
        }
      }
    }
  }

  walk(dir, "");
  return results;
}

app.get("/api/approvals", (_, res) => {
  res.json(findAllApprovals(path.join(AGENTS_DIR, "boards")));
});

app.get("/api/guide", (req, res) => {
  const engine = (req.query.engine || "").toLowerCase();
  const commandsDir = path.join(require("os").homedir(), ".claude", "commands");
  const guides = {
    roblox: path.join(commandsDir, "roblox-dev.md"),
    unity: path.join(commandsDir, "unity-dev.md"),
  };

  if (engine && guides[engine] && fs.existsSync(guides[engine])) {
    return res.json({
      content: fs.readFileSync(guides[engine], "utf-8"),
      source: guides[engine],
      engine,
      exists: true,
    });
  }

  const available = Object.entries(guides)
    .filter(([, p]) => fs.existsSync(p))
    .map(([name, p]) => ({
      engine: name,
      content: fs.readFileSync(p, "utf-8"),
      source: p,
      exists: true,
    }));

  if (available.length > 0) return res.json(available[0]);
  res.json({ content: "", source: "", engine: "", exists: false });
});

app.get("/api/status", (_, res) => {
  res.json({ watching: AGENTS_DIR, alive: true });
});

app.listen(PORT, () => {
  console.log(`Agent API: http://localhost:${PORT}`);
  console.log(`Watching:  ${AGENTS_DIR}`);
});
