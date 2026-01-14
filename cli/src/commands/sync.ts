import { Command } from "commander";
import { existsSync, mkdirSync, cpSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  loadConfig,
  loadLockFile,
  saveLockFile,
  listAvailableSkills,
  getSkillSourcePath,
  calculateDirectoryHash,
  expandPath,
  isGitManaged,
  type LockFile,
  type DestinationStatus,
} from "../utils/config.js";

export const syncCommand = new Command("sync")
  .description("Sync skills to configured destinations based on skills.yaml")
  .option("--dry-run", "Show what would be done without making changes")
  .action((options) => {
    const config = loadConfig();
    const lock = loadLockFile();
    const availableSkills = listAvailableSkills();
    const newLock: LockFile = {};

    const skillNames = Object.keys(config);
    const lockSkillNames = Object.keys(lock);

    if (skillNames.length === 0 && lockSkillNames.length === 0) {
      console.log("No skills configured in skills.yaml");
      console.log("Copy skills.yaml.example to skills.yaml and add destinations");
      return;
    }

    let hasChanges = false;

    for (const skillName of skillNames) {
      const destinations = config[skillName];
      if (!destinations || destinations.length === 0) {
        continue;
      }

      const skill = availableSkills.find((s) => s.name === skillName);
      if (!skill) {
        console.log(`⚠ Skill "${skillName}" not found in skills/ directory`);
        continue;
      }

      if (!skill.hasSkillMd) {
        console.log(`⚠ Skill "${skillName}" is missing SKILL.md`);
        continue;
      }

      const sourcePath = getSkillSourcePath(skillName);
      const sourceHash = calculateDirectoryHash(sourcePath);

      newLock[skillName] = {
        source_hash: sourceHash,
        destinations: {},
      };

      console.log(`\n${skillName}:`);

      for (const dest of destinations) {
        const expandedDest = expandPath(dest);
        const destSkillPath = join(expandedDest, skillName);
        const destHash = calculateDirectoryHash(destSkillPath);
        const previousStatus = lock[skillName]?.destinations?.[dest];

        const status: DestinationStatus = {
          hash: destHash || sourceHash,
          status: "synced",
          synced_at: new Date().toISOString(),
        };

        // Check if destination exists
        if (!existsSync(destSkillPath)) {
          // New copy needed
          if (options.dryRun) {
            console.log(`  ${dest}: would copy (new)`);
          } else {
            mkdirSync(dirname(destSkillPath), { recursive: true });
            cpSync(sourcePath, destSkillPath, { recursive: true });
            console.log(`  ${dest}: ✓ copied`);
          }
          hasChanges = true;
        } else if (destHash === sourceHash) {
          // Already in sync
          console.log(`  ${dest}: ✓ synced`);
        } else {
          // Destination differs from source
          const destIsGitManaged = isGitManaged(destSkillPath);

          if (destIsGitManaged) {
            console.log(`  ${dest}: ⚠ diverged (git managed, skipped)`);
            status.status = "diverged";
            status.pending_action = "update";
          } else if (previousStatus?.hash && previousStatus.hash !== destHash) {
            // Local modifications detected
            console.log(`  ${dest}: ⚠ diverged (local changes, skipped)`);
            status.status = "diverged";
            status.pending_action = "update";
          } else {
            // Safe to update
            if (options.dryRun) {
              console.log(`  ${dest}: would update`);
            } else {
              rmSync(destSkillPath, { recursive: true, force: true });
              cpSync(sourcePath, destSkillPath, { recursive: true });
              console.log(`  ${dest}: ✓ updated`);
            }
            hasChanges = true;
          }
        }

        newLock[skillName].destinations[dest] = status;
      }
    }

    // Handle deletions: skills in lock but not in config
    for (const skillName of Object.keys(lock)) {
      if (config[skillName]) continue;

      const lockEntry = lock[skillName];
      console.log(`\n${skillName} (removed from config):`);

      for (const dest of Object.keys(lockEntry.destinations)) {
        const expandedDest = expandPath(dest);
        const destSkillPath = join(expandedDest, skillName);

        if (!existsSync(destSkillPath)) {
          console.log(`  ${dest}: already deleted`);
          continue;
        }

        const destHash = calculateDirectoryHash(destSkillPath);
        const previousHash = lockEntry.destinations[dest]?.hash;
        const destIsGitManaged = isGitManaged(destSkillPath);

        if (destIsGitManaged) {
          console.log(`  ${dest}: ⚠ cannot delete (git managed)`);
          // Keep in lock as pending
          if (!newLock[skillName]) {
            newLock[skillName] = { source_hash: "", destinations: {} };
          }
          newLock[skillName].destinations[dest] = {
            hash: destHash,
            status: "diverged",
            synced_at: new Date().toISOString(),
            pending_action: "delete",
          };
        } else if (previousHash && previousHash !== destHash) {
          console.log(`  ${dest}: ⚠ cannot delete (local changes)`);
          if (!newLock[skillName]) {
            newLock[skillName] = { source_hash: "", destinations: {} };
          }
          newLock[skillName].destinations[dest] = {
            hash: destHash,
            status: "diverged",
            synced_at: new Date().toISOString(),
            pending_action: "delete",
          };
        } else {
          if (options.dryRun) {
            console.log(`  ${dest}: would delete`);
          } else {
            rmSync(destSkillPath, { recursive: true, force: true });
            console.log(`  ${dest}: ✓ deleted`);
          }
          hasChanges = true;
        }
      }
    }

    // Also check for destinations removed from a skill's config
    for (const skillName of skillNames) {
      const currentDests = new Set(config[skillName] || []);
      const lockEntry = lock[skillName];
      if (!lockEntry) continue;

      for (const dest of Object.keys(lockEntry.destinations)) {
        if (currentDests.has(dest)) continue;

        const expandedDest = expandPath(dest);
        const destSkillPath = join(expandedDest, skillName);

        if (!existsSync(destSkillPath)) {
          continue;
        }

        const destHash = calculateDirectoryHash(destSkillPath);
        const previousHash = lockEntry.destinations[dest]?.hash;
        const destIsGitManaged = isGitManaged(destSkillPath);

        console.log(`\n${skillName} (destination removed: ${dest}):`);

        if (destIsGitManaged || (previousHash && previousHash !== destHash)) {
          console.log(`  ⚠ cannot delete (${destIsGitManaged ? "git managed" : "local changes"})`);
          newLock[skillName].destinations[dest] = {
            hash: destHash,
            status: "diverged",
            synced_at: new Date().toISOString(),
            pending_action: "delete",
          };
        } else {
          if (options.dryRun) {
            console.log(`  would delete`);
          } else {
            rmSync(destSkillPath, { recursive: true, force: true });
            console.log(`  ✓ deleted`);
          }
          hasChanges = true;
        }
      }
    }

    if (!options.dryRun) {
      saveLockFile(newLock);
    }

    console.log("");
    if (!hasChanges) {
      console.log("All skills are up to date.");
    } else if (options.dryRun) {
      console.log("Run without --dry-run to apply changes.");
    }
  });
