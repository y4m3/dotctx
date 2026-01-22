# dotctx

Claude Code context management CLI.

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## Structure

```
dotctx/
├── src/                    # CLI source (TypeScript)
│   └── src/
│       ├── commands/       # CLI commands (list, sync, status)
│       └── utils/          # Utilities (config, hash)
├── components/             # Component definitions
│   ├── core/               # Core hooks and rules
│   │   ├── hooks/
│   │   └── rules/
│   ├── linear-issue/       # Linear issue skill
│   │   └── SKILL.md
│   ├── pr-check/           # PR check skill
│   │   └── SKILL.md
│   └── start-work/         # Start work skill
│       ├── SKILL.md
│       ├── hooks/
│       └── rules/
├── config.yaml             # Local config (git-ignored)
└── config.lock.yaml        # Sync state (git-ignored)
```

## Installation

```bash
npm install
npm run build
```

## Usage

### Configure components

Create `config.yaml` with your components and destinations:

```yaml
# Components to enable
components:
  - core
  - linear-issue
  - start-work
  - pr-check

# Destinations for syncing
destinations:
  - ~/.claude
  # Add project-specific destinations as needed:
  # - ~/repos/project-a/.claude
  # - ~/repos/project-b/.claude
```

### Commands

```bash
# List available components
npm run dotctx -- list

# Sync components to configured destinations
npm run dotctx -- sync

# Preview changes without applying
npm run dotctx -- sync --dry-run

# Show sync status
npm run dotctx -- status
```

## How it works

1. **Copy-based deployment**: Components are copied (not symlinked) to destinations
2. **Idempotent**: Running sync multiple times is safe
3. **Protected updates**: Local changes and git-managed destinations are protected
4. **Lock file**: `config.lock.yaml` tracks sync state for change detection

## Adding new components

Create a new directory under `components/` with the appropriate structure:

```
components/
└── my-component/
    ├── SKILL.md      # Skill definition (optional)
    ├── hooks/        # Hook scripts (optional)
    └── rules/        # Rule files (optional)
```

Then add it to your `config.yaml` components list.
