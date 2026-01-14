import { Command } from "commander";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  loadConfig,
  loadLockFile,
  listAvailableSkills,
  calculateDirectoryHash,
  expandPath,
  getSkillSourcePath,
} from "../utils/config.js";

export const statusCommand = new Command("status")
  .description("Show sync status of configured skills")
  .action(() => {
    const config = loadConfig();
    const lock = loadLockFile();
    const availableSkills = listAvailableSkills();

    const skillNames = Object.keys(config);
    if (skillNames.length === 0) {
      console.log("No skills configured in skills.yaml");
      console.log("Copy skills.yaml.example to skills.yaml and add destinations");
      return;
    }

    console.log("Skill sync status:\n");

    for (const skillName of skillNames) {
      const destinations = config[skillName];
      if (!destinations || destinations.length === 0) {
        console.log(`${skillName}: (no destinations configured)`);
        continue;
      }

      const skill = availableSkills.find((s) => s.name === skillName);
      const sourcePath = getSkillSourcePath(skillName);
      const sourceHash = skill ? calculateDirectoryHash(sourcePath) : "";

      console.log(`${skillName}:`);

      for (const dest of destinations) {
        const expandedDest = expandPath(dest);
        const destSkillPath = join(expandedDest, skillName);
        const lockEntry = lock[skillName]?.destinations?.[dest];

        if (!existsSync(destSkillPath)) {
          console.log(`  ${dest}: ○ not deployed`);
          continue;
        }

        const destHash = calculateDirectoryHash(destSkillPath);

        if (destHash === sourceHash) {
          console.log(`  ${dest}: ✓ synced`);
        } else if (lockEntry?.status === "diverged") {
          const action = lockEntry.pending_action;
          console.log(`  ${dest}: ⚠ diverged (pending: ${action || "update"})`);
        } else {
          console.log(`  ${dest}: ⚠ out of sync`);
        }
      }

      console.log("");
    }

    // Show pending deletions
    const pendingDeletions: { skill: string; dest: string }[] = [];
    for (const skillName of Object.keys(lock)) {
      if (config[skillName]) continue;
      for (const dest of Object.keys(lock[skillName]?.destinations || {})) {
        const status = lock[skillName].destinations[dest];
        if (status?.pending_action === "delete") {
          pendingDeletions.push({ skill: skillName, dest });
        }
      }
    }

    if (pendingDeletions.length > 0) {
      console.log("Pending deletions (blocked by local changes/git):");
      for (const { skill, dest } of pendingDeletions) {
        console.log(`  ${skill}: ${dest}`);
      }
      console.log("");
    }
  });
