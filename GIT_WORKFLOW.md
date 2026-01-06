# Git Workflow Guide

Quick reference for updating the GitHub repository.

## Repository Info
- **Owner**: cDilash
- **Repo**: workout-app
- **URL**: https://github.com/cDilash/workout-app

---

## Quick Commands

### Check Status
```bash
git status                    # See what's changed
git diff --stat               # Summary of changes
git diff <file>               # Detailed changes in a file
```

### Commit & Push Changes
```bash
# Stage all changes
git add -A

# Or stage specific files
git add <file1> <file2>

# Commit with message
git commit -m "type: Brief description

Longer explanation if needed"

# Push to GitHub
git push origin main
```

### Pull Latest Changes
```bash
git pull origin main
```

---

## Commit Message Convention

Use conventional commit format:

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `style` | Formatting, styling changes |
| `docs` | Documentation updates |
| `chore` | Build, config, dependencies |
| `test` | Adding or fixing tests |

### Examples
```bash
# New feature
git commit -m "feat: Add rest timer with haptic feedback"

# Bug fix
git commit -m "fix: Resolve hooks order violation in workout screen"

# Refactoring
git commit -m "refactor: Migrate icons from FontAwesome to Phosphor"

# Dependencies
git commit -m "chore: Update expo-sqlite to v15"
```

---

## When to Update GitHub

Update your repo after:

1. **Completing a feature** - New functionality that works
2. **Fixing a bug** - After verifying the fix
3. **Major refactoring** - After TypeScript check passes
4. **Dependency updates** - After testing app still works
5. **End of coding session** - Save your progress

### Pre-Push Checklist
```bash
# 1. Run TypeScript check
npx tsc --noEmit

# 2. Check for uncommitted changes
git status

# 3. Review what you're committing
git diff --staged

# 4. Commit and push
git add -A
git commit -m "your message"
git push origin main
```

---

## Common Scenarios

### Undo Last Commit (before push)
```bash
git reset --soft HEAD~1    # Keep changes staged
git reset --mixed HEAD~1   # Keep changes unstaged
```

### Discard Local Changes
```bash
git checkout -- <file>     # Discard changes in specific file
git checkout -- .          # Discard all changes (careful!)
```

### View Commit History
```bash
git log --oneline -10      # Last 10 commits
git log --oneline --graph  # With branch visualization
```

### Create a Branch (for experiments)
```bash
git checkout -b feature/new-thing
# ... make changes ...
git checkout main
git merge feature/new-thing
```

---

## Typical Workflow

```bash
# 1. Start working
git pull origin main       # Get latest

# 2. Make your changes
# ... code ...

# 3. Verify changes work
npx tsc --noEmit

# 4. Stage and commit
git add -A
git status                 # Review what's staged
git commit -m "feat: Description of changes"

# 5. Push to GitHub
git push origin main
```

---

## Files to Always Commit

- Source code (`app/`, `src/`)
- Configuration (`package.json`, `tsconfig.json`, `tamagui.config.ts`)
- Documentation (`CLAUDE.md`, `README.md`)

## Files to Never Commit

- `node_modules/` (in .gitignore)
- `.env` files with secrets
- Build outputs (`.expo/`, `dist/`)
- OS files (`.DS_Store`)

---

## Need Help?

```bash
git --help                 # General help
git <command> --help       # Help for specific command
```
