import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
export interface SkillConfig {
  [skillName: string]: string[] | undefined;
}

export interface DestinationStatus {
  hash: string;
  status: "synced" | "diverged" | "missing" | "deleted";
  synced_at: string;
  pending_action?: "update" | "delete";
}

export interface SkillLockEntry {
  source_hash: string;
  destinations: {
    [path: string]: DestinationStatus;
  };
}

export interface LockFile {
  [skillName: string]: SkillLockEntry;
}

export interface SkillInfo {
  name: string;
  path: string;
  hasSkillMd: boolean;
}

// Path utilities
export function getProjectRoot(): string {
  // Navigate from cli/src/utils to project root (3 levels up from dist)
  return resolve(__dirname, "..", "..", "..");
}

export function getSkillsSourceDir(): string {
  return join(getProjectRoot(), "skills");
}

export function getConfigPath(): string {
  return join(getProjectRoot(), "skills.yaml");
}

export function getLockPath(): string {
  return join(getProjectRoot(), "skills.lock.yaml");
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return resolve(path);
}

// Config file operations
export function loadConfig(): SkillConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return {};
  }
  const content = readFileSync(configPath, "utf-8");
  return parseYaml(content) || {};
}

export function loadLockFile(): LockFile {
  const lockPath = getLockPath();
  if (!existsSync(lockPath)) {
    return {};
  }
  const content = readFileSync(lockPath, "utf-8");
  return parseYaml(content) || {};
}

export function saveLockFile(lock: LockFile): void {
  const lockPath = getLockPath();
  writeFileSync(lockPath, stringifyYaml(lock), "utf-8");
}

// Skill discovery
export function listAvailableSkills(): SkillInfo[] {
  const skillsDir = getSkillsSourceDir();
  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = readdirSync(skillsDir);
  const skills: SkillInfo[] = [];

  for (const entry of entries) {
    const entryPath = join(skillsDir, entry);
    const stat = statSync(entryPath);
    if (stat.isDirectory()) {
      const skillMdPath = join(entryPath, "SKILL.md");
      skills.push({
        name: entry,
        path: entryPath,
        hasSkillMd: existsSync(skillMdPath),
      });
    }
  }

  return skills;
}

export function getSkillSourcePath(skillName: string): string {
  return join(getSkillsSourceDir(), skillName);
}

// Hash calculation
export function calculateDirectoryHash(dirPath: string): string {
  if (!existsSync(dirPath)) {
    return "";
  }

  const hash = createHash("sha256");
  const files = getAllFiles(dirPath).sort();

  for (const file of files) {
    const relativePath = file.replace(dirPath, "");
    const content = readFileSync(file);
    hash.update(relativePath);
    hash.update(content);
  }

  return hash.digest("hex").substring(0, 12);
}

function getAllFiles(dirPath: string, files: string[] = []): string[] {
  const entries = readdirSync(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// Git detection
export function isGitManaged(path: string): boolean {
  let current = path;
  while (current !== dirname(current)) {
    if (existsSync(join(current, ".git"))) {
      return true;
    }
    current = dirname(current);
  }
  return false;
}
