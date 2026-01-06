# Workout App - Project Guidelines

## Overview
A React Native workout logging app similar to Strong, built with Expo (managed workflow). Local-first with SQLite storage, no user accounts required.

## Tech Stack
- **Framework**: React Native + Expo SDK 54 (managed)
- **Language**: TypeScript (strict)
- **Database**: expo-sqlite + Drizzle ORM
- **State Management**: Zustand
- **Navigation**: Expo Router (file-based)
- **UI Framework**: Tamagui (with custom theme in `tamagui.config.ts`)
- **Charts**: Victory Native (Skia-based) + gifted-charts (for PieChart only)
- **Icons**: Phosphor React Native (phosphor-react-native)
- **Graphics Engine**: @shopify/react-native-skia

## Architecture Principles

### Data Layer
- All data stored locally in SQLite via Drizzle ORM
- Schema defined in `src/db/schema.ts`
- Use `expo-crypto` for UUID generation (not `uuid` package - crypto.getRandomValues not supported)
- Database initialized in `src/db/client.ts`

### State Management
- **Zustand stores** for in-memory state (active workout, timer, settings)
- **React hooks** for database queries (`useWorkoutHistory`, `useExercises`, etc.)
- Keep stores minimal - derive computed values in components

### Component Structure
```
app/                    # Expo Router screens
├── (tabs)/            # Tab navigation screens
├── workout/[id].tsx   # Active workout session
└── exercise/[id].tsx  # Exercise detail/history

src/
├── components/        # Reusable UI components
├── db/               # Database schema, client, migrations
├── hooks/            # Data fetching hooks
├── stores/           # Zustand stores
└── utils/            # Helper functions
```

## Code Conventions

### Styling
- Use `StyleSheet.create()` for all styles (Tamagui components are available but StyleSheet is currently primary)
- Tamagui theme configured in `tamagui.config.ts` with light/dark mode support
- Keep styles at bottom of component file
- Use `backgroundColor: 'transparent'` for View components inside styled containers (to prevent theme issues)
- Color palette (defined in Tamagui theme):
  - Primary: `#007AFF` (iOS blue)
  - Success: `#34C759` (green)
  - Warning: `#FF9500` (orange)
  - Danger: `#FF3B30` (red)
  - Background: `#f9f9f9`, `#f0f0f0`

### Component Patterns
- Functional components with hooks only
- Props interfaces defined inline or in same file
- Use `Pressable` over `TouchableOpacity`
- Always provide `key` prop for list items

### Database Operations
- Wrap complex operations in try/catch
- Use `eq()`, `desc()`, `gte()` from drizzle-orm for queries
- Foreign key relationships handled manually (SQLite constraint)

## Key Features

### Workout Flow
1. Start empty workout or from template
2. Add exercises from library (118 pre-seeded)
3. Log sets with weight/reps, mark warmup vs working
4. Auto-start rest timer on set completion
5. Save as template or finish workout

### Exercise Types
- Categorized by muscle group (Chest, Back, Shoulders, etc.)
- Equipment types: Barbell, Dumbbell, Cable, Machine, Bodyweight, Kettlebell
- Support for custom user-created exercises

### Data Tracking
- Personal records (max weight, estimated 1RM, max volume)
- Workout history with stats
- Progress charts (strength over time, volume trends)
- Workout frequency calendar

## Common Gotchas

1. **Hooks order**: All hooks must be called unconditionally before any early returns
2. **expo-file-system**: Use `new File(Paths.cache, name)` API (SDK 54+), not legacy `cacheDirectory`
3. **Victory Native Charts**: Use `CartesianChart` container with `Line` or `Bar` components; data needs `x`/`y` keys
4. **Phosphor Icons**: Import each icon separately (e.g., `import { Plus, ArrowLeft } from 'phosphor-react-native'`)
5. **Tamagui**: Babel plugin configured in `babel.config.js`; must use TamaguiProvider in root layout
6. **Skia**: Requires `@shopify/react-native-skia` for Victory Native chart rendering
7. **Modals**: Use `presentationStyle="pageSheet"` for iOS-style modals

## Testing Checklist
- [ ] Workout can be started, exercises added, sets logged
- [ ] Rest timer functions with haptics/sound
- [ ] Templates can be saved and loaded
- [ ] History shows correct stats
- [ ] Export generates valid JSON/CSV
- [ ] Exercise detail shows history and PRs

## Future Considerations
- Body measurements tracking
- Dark mode support
- Plate calculator
- Cloud sync (optional)
- Apple Watch companion
