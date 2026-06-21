const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const candidates = [
  path.join(root, "build", "dev-electron", "LANDEV Tracker Dev.exe"),
  path.join(root, "build", "dev-electron", "electron.exe"),
  path.join(root, "node_modules", "electron", "dist", "electron.exe")
];

const exePath = candidates.find((candidate) => fs.existsSync(candidate));
if (!exePath) {
  throw new Error("No Electron executable found. Run: npm install");
}

module.exports = exePath;
