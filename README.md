# agent-skills

Claude Code skills management monorepo.

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## Structure

```
agent-skills/
├── cli/                    # Skill management CLI (TypeScript)
│   └── src/
│       ├── commands/       # CLI commands (list, sync, status)
│       └── utils/          # Utilities (config, hash)
├── skills/                 # Skill definitions
│   └── pr-check/           # GitHub PR check skill
├── skills.yaml.example     # Template for skill configuration
├── skills.yaml             # Local config (git-ignored)
└── skills.lock.yaml        # Sync state (git-ignored)
```

## Installation

```bash
npm install
npm run build
```

## Usage

### Configure skills

Copy the template and add your destinations:

```bash
cp skills.yaml.example skills.yaml
```

Edit `skills.yaml`:

```yaml
pr-check:
  - ~/.claude/skills
  - ~/repos/myproject/.claude/skills
```

### Commands

```bash
# List available skills
npm run skill -- list

# Sync skills to configured destinations
npm run skill -- sync

# Preview changes without applying
npm run skill -- sync --dry-run

# Show sync status
npm run skill -- status
```

## How it works

1. **Copy-based deployment**: Skills are copied (not symlinked) to destinations
2. **Idempotent**: Running sync multiple times is safe
3. **Protected updates**: Local changes and git-managed destinations are protected
4. **Lock file**: `skills.lock.yaml` tracks sync state for change detection

## Adding new skills

Create a new directory under `skills/` with a `SKILL.md` file:

```
skills/
└── my-skill/
    └── SKILL.md
```

Then add it to `skills.yaml.example` and your local `skills.yaml`.
