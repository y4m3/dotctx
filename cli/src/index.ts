#!/usr/bin/env node
import { Command } from "commander";
import { listCommand } from "./commands/list.js";
import { syncCommand } from "./commands/sync.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("skill")
  .description("Claude Code skill management CLI")
  .version("1.0.0");

program.addCommand(listCommand);
program.addCommand(syncCommand);
program.addCommand(statusCommand);

program.parse();
