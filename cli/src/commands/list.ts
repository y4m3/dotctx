import { Command } from "commander";
import { listAvailableSkills, loadConfig } from "../utils/config.js";

export const listCommand = new Command("list")
  .description("List available skills")
  .action(() => {
    const skills = listAvailableSkills();
    const config = loadConfig();

    if (skills.length === 0) {
      console.log("No skills found in skills/ directory");
      return;
    }

    console.log("Available skills:\n");
    console.log("  Name          Valid    Configured");
    console.log("  ─────────────────────────────────────");

    for (const skill of skills) {
      const isValid = skill.hasSkillMd ? "✓" : "✗";
      const destinations = config[skill.name];
      const configStatus = destinations && destinations.length > 0
        ? `${destinations.length} destination(s)`
        : "-";

      console.log(
        `  ${skill.name.padEnd(14)} ${isValid.padEnd(8)} ${configStatus}`
      );
    }

    console.log("");
  });
