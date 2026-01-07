# Workout App - Project Guidelines

## Overview
A React Native workout logging app similar to Strong, built with Expo (managed workflow). Local-first with SQLite storage, no user accounts required.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React Native + Expo SDK 54 (managed) |
| **Language** | TypeScript (strict) |
| **Database** | expo-sqlite + Drizzle ORM |
| **State** | Zustand |
| **Navigation** | Expo Router (file-based) |
| **UI Framework** | Tamagui (with custom theme) |
| **Charts** | Victory Native (Skia-based) + gifted-charts (PieChart) |
| **Icons** | Phosphor React Native |
| **Graphics** | @shopify/react-native-skia |
| **Blur Effects** | expo-blur |

---

## UI & Design System

### Framework Configuration
- **Core Library**: Tamagui (Headless + Core)
- **Compiler**: Enabled (`@tamagui/babel-plugin`) for zero-runtime overhead
- **Theme Strategy**:
  - Base: `@tamagui/config/v3`
  - Mode: System (Dark/Light) auto-detection
  - Palette: `Zinc` (Neutrals) + `Blue` (Primary) + `Rose` (Danger)

### Design Tokens (in `tamagui.config.ts`)
```typescript
// Transparency tokens for glassmorphism
background025: 'rgba(255, 255, 255, 0.25)'  // Subtle overlay
background050: 'rgba(255, 255, 255, 0.50)'  // Medium glass
background075: 'rgba(255, 255, 255, 0.75)'  // Strong glass
background090: 'rgba(255, 255, 255, 0.90)'  // Near-opaque

// Spacing scale (in pixels, access as $1, $2, $3...)
$1: 4, $2: 8, $3: 12, $4: 16, $5: 20, $6: 24, $8: 32

// Radius scale
$sm: 6, $md: 10, $lg: 14, $xl: 20, $card: 16
```

### "Modern Look" Principles (Bento + Glass)

1. **Bento Grids**:
   - Use `YStack` and `XStack` with `gap="$3"` or `gap="$4"` for layouts
   - Cards: Use `$cardBackground` (semi-transparent) + blur for depth

2. **Typography Hierarchy**:
   - Giant headers, minimal body text
   - Use `H1` to `H3` for sections; `SizableText` for data

3. **Glassmorphism**:
   - Use `<BlurView />` from `expo-blur` for overlays/modals
   - Combine with `$background075` for glass effect

4. **Icons**:
   - Library: `phosphor-react-native`
   - Style: `Duotone` (adds depth) or `Regular` (clean)
   - Sizes: 20px (small), 24px (standard), 32px (large)

---

## Code Conventions

### Styling Rules

```tsx
// ❌ AVOID: StyleSheet.create() - bypasses Tamagui compiler
const styles = StyleSheet.create({
  container: { padding: 16 }
});

// ✅ USE: Tamagui props directly
<YStack padding="$4" gap="$3" backgroundColor="$cardBackground">

// ✅ USE: styled() factory for reusable components
import { styled, YStack } from 'tamagui';

const Card = styled(YStack, {
  padding: '$4',
  borderRadius: '$card',
  backgroundColor: '$cardBackground',
  borderWidth: 1,
  borderColor: '$borderColor',

  variants: {
    elevated: {
      true: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    },
  },
});
```

### Component Structure Example

```tsx
// Modern Stat Card with Bento styling
import { Card, Text, YStack } from 'tamagui';
import { TrendUp } from 'phosphor-react-native';

export const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Card
    elevate
    size="$4"
    bordered
    animation="bouncy"
    scale={0.9}
    pressStyle={{ scale: 0.925 }}
  >
    <Card.Header padded>
      <YStack gap="$1">
        <Text
          color="$colorMuted"
          fontSize="$2"
          textTransform="uppercase"
          letterSpacing={1}
        >
          {title}
        </Text>
        <Text fontSize="$8" fontWeight="800" color="$color">
          {value}
        </Text>
      </YStack>
    </Card.Header>
  </Card>
);
```

### Responsive Design

```tsx
// Array syntax for breakpoints
<YStack width={['100%', '50%', '33%']} />

// Media query helpers
<Text fontSize={{ xs: '$4', md: '$6' }} />
```

---

## Architecture Principles

### Data Layer
- All data stored locally in SQLite via Drizzle ORM
- Schema defined in `src/db/schema.ts`
- Use `expo-crypto` for UUID generation (not `uuid` package)
- See `DATA_HANDLING.md` for canonical data structures

### State Management
- **Zustand stores**: In-memory state (active workout, timer, settings)
- **React hooks**: Database queries (`useWorkoutHistory`, `useExercises`)
- Keep stores minimal - derive computed values in components

### Project Structure
```
app/                    # Expo Router screens
├── (tabs)/            # Tab navigation screens
├── workout/[id].tsx   # Active workout session
└── exercise/[id].tsx  # Exercise detail/history

src/
├── components/
│   ├── ui/            # Reusable Tamagui components
│   └── workout/       # Feature-specific components
├── db/               # Database schema, client
├── hooks/            # Data fetching hooks
├── stores/           # Zustand stores
└── utils/            # Helper functions
```

---

## Component Patterns

### DO
- Functional components with hooks only
- Use `Pressable` over `TouchableOpacity`
- Define props interfaces inline or in same file
- Use Tamagui tokens for all values (`$4` not `16`)

### DON'T
- Don't use `StyleSheet.create()` (defeats Tamagui optimization)
- Don't hardcode colors (use theme tokens)
- Don't compute metrics in storage (calculate at read time)

---

## Key Features

### Workout Flow
1. Start empty workout or from template
2. Add exercises from library (118 pre-seeded)
3. Log sets with weight/reps, mark warmup vs working
4. Auto-start rest timer on set completion
5. Save as template or finish workout

### Data Tracking
- Personal records (max weight, estimated 1RM, max volume)
- Workout history with stats
- Progress charts (strength over time, volume trends)
- Workout frequency calendar

**Note**: Metrics like volume, 1RM, totals are computed at read-time only - never stored. See `DATA_HANDLING.md`.

---

## Common Gotchas

1. **Hooks order**: All hooks must be called before any early returns
2. **Victory Charts**: Use `CartesianChart` + `Line`/`Bar`; data needs `x`/`y` keys
3. **Phosphor Icons**: Import each separately (`import { Plus } from 'phosphor-react-native'`)
4. **Tamagui Babel**: Plugin configured in `babel.config.js`; requires TamaguiProvider in root
5. **expo-file-system**: Use `new File(Paths.cache, name)` API (SDK 54+)
6. **Modals**: Use `presentationStyle="pageSheet"` for iOS-style

---

## Testing Checklist
- [ ] Workout can be started, exercises added, sets logged
- [ ] Rest timer functions with haptics
- [ ] Templates can be saved and loaded
- [ ] History shows correct stats (computed at read time)
- [ ] Export generates valid JSON/CSV
- [ ] Dark mode works correctly

---

## Future Considerations
- Body measurements tracking
- Plate calculator
- Cloud sync (optional)
- Apple Watch companion
