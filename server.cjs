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

app.get("/api/boards", (req, res) => {
  const subpath = (req.query.path || "").replace(/\.\./g, "");
  const dirPath = path.join(AGENTS_DIR, "boards", subpath);

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

app.get("/api/guide", (_, res) => {
  const guideLocations = [
    path.join(require("os").homedir(), ".claude", "commands", "roblox-dev.md"),
  ];
  for (const loc of guideLocations) {
    if (fs.existsSync(loc)) {
      return res.json({
        content: fs.readFileSync(loc, "utf-8"),
        source: loc,
        exists: true,
      });
    }
  }
  res.json({ content: "", source: "", exists: false });
});

app.get("/api/status", (_, res) => {
  res.json({ watching: AGENTS_DIR, alive: true });
});

app.listen(PORT, () => {
  console.log(`Agent API: http://localhost:${PORT}`);
  console.log(`Watching:  ${AGENTS_DIR}`);
});
