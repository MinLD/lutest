import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const uiRoot = path.join(root, "apps", "ui");
const standaloneUi = path.join(uiRoot, ".next", "standalone", "apps", "ui");
const staticSource = path.join(uiRoot, ".next", "static");
const staticTarget = path.join(standaloneUi, ".next", "static");
const publicSource = path.join(uiRoot, "public");
const publicTarget = path.join(standaloneUi, "public");

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) return;
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
}

for (const name of [".env", ".env.local", ".env.development", ".env.production"]) {
  fs.rmSync(path.join(standaloneUi, name), { force: true });
}

copyIfExists(staticSource, staticTarget);
copyIfExists(publicSource, publicTarget);

const serverFile = path.join(standaloneUi, "server.js");
if (fs.existsSync(serverFile)) {
  const rootPattern = new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  fs.writeFileSync(serverFile, fs.readFileSync(serverFile, "utf8").replace(rootPattern, "."));
}
