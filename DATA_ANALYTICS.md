# Data Analytics Specification

This document defines **all analytics derived from the workout data model** and clarifies **what belongs on Mobile vs Web**. It assumes:

- Canonical, versioned Workout JSON as source of truth
- Set-level data with load, reps, RPE/RIR, rest, flags
- No derived metrics stored at write-time (computed at read-time per `DATA_HANDLING.md`)

---

## 1. Analytics Philosophy

### Mobile = Awareness & Action
- Fast feedback
- Minimal cognitive load
- Session-level + short-term trends
- **5-second rule**: If an insight cannot be understood in 5 seconds, it doesn't belong on mobile

### Web = Analysis & Strategy
- Longitudinal trends
- Comparisons, correlations
- Program and coaching intelligence
- Dense visualizations acceptable

---

## 2. Core Derived Metrics (Never Stored)

All metrics are computed at read-time to ensure consistency and allow algorithm updates to retroactively apply to historical data.

### 2.1 Volume Metrics

| Metric | Formula | Resolution |
|--------|---------|------------|
| **Set Volume** | `weight_kg × reps` | set |
| **Exercise Volume** | `Σ set_volumes` (excluding warmups) | exercise |
| **Workout Volume** | `Σ exercise_volumes` | workout |
| **Weekly Volume** | `Σ workout_volumes` per 7-day window | week |

**Implementation**: `src/utils/calculations.ts`
```typescript
calculateSetVolume(weightKg, reps) → number
calculateExerciseVolume(sets, excludeWarmups?) → number
calculateWorkoutVolume(workout) → number
```

### 2.2 Intensity Metrics

| Metric | Formula | Notes |
|--------|---------|-------|
| **Estimated 1RM (Brzycki)** | `weight × (36 / (37 - reps))` | Primary formula |
| **Estimated 1RM (Epley)** | `weight × (1 + reps/30)` | Alternative |
| **Relative Intensity** | `weight / estimated_1RM` | 0-1 scale |
| **Top Set Intensity** | `max(relative_intensity)` per exercise | Per exercise |

**Implementation**: `src/utils/calculations.ts`
```typescript
calculateEstimated1RM(weightKg, reps) → number      // Brzycki
calculateEstimated1RMEpley(weightKg, reps) → number // Alternative
calculateRelativeIntensity(weightKg, est1RM) → number
calculateTopSetIntensity(sets, estimated1RM) → number
```

### 2.3 Effort & Fatigue Metrics

| Metric | Formula | Notes |
|--------|---------|-------|
| **Hard Sets** | Sets with `RPE ≥ 8` OR `RIR ≤ 2` | Boolean per set |
| **Average RPE** | `mean(RPE)` per workout | Nullable if no RPE data |
| **Effort Density** | `workout_volume / duration_minutes` | kg/min |
| **Fatigue Index** | `avg_RPE × total_sets` | Simple accumulation proxy |

**Implementation**: `src/utils/calculations.ts`
```typescript
isHardSet(set) → boolean
countHardSets(sets) → number
calculateAverageRPE(sets) → number | null
calculateEffortDensity(volume, durationSeconds) → number
calculateFatigueIndex(avgRPE, totalSets) → number
```

### 2.4 Frequency & Consistency

| Metric | Formula | Resolution |
|--------|---------|------------|
| **Training Frequency** | Workouts per week | week |
| **Exercise Frequency** | Appearances per week | week |
| **Streaks** | Consecutive weeks meeting frequency target | week/month |
| **Missed Sessions** | Planned vs actual (if plan exists) | week |

**Implementation**: `src/hooks/usePersonalRecords.ts`
```typescript
useWorkoutFrequency() → { frequencyData }
useTrainingStreaks() → { currentStreak, longestStreak, isOnTrack }
```

---

## 3. Performance Progression Analytics

### 3.1 PR Detection

| PR Type | Definition | Rules |
|---------|------------|-------|
| **Weight PR** | Max weight per exercise | Exclude warmups, deleted sets |
| **Rep PR** | Max reps at same weight | Context-aware |
| **Volume PR** | Max volume per exercise per session | Single session max |
| **Estimated 1RM PR** | Highest computed 1RM | Primary strength indicator |

**Implementation**: `src/utils/calculations.ts`
```typescript
isPersonalRecord(currentValue, historicalSets, metric) → boolean
detectSetPRs(set, historicalSets) → PRMetric[]
```

### 3.2 Progression Signals

| Signal | Definition |
|--------|------------|
| **Positive Trend** | Rolling average ↑ over N sessions |
| **Plateau** | No PR or progression over N sessions |
| **Regression** | Sustained drop in reps or load |

Resolution: exercise / movement pattern

**Implementation**: `src/utils/calculations.ts`
```typescript
type ProgressionSignal = 'positive' | 'plateau' | 'regression' | null;
detectProgressionSignal(dataPoints, windowSize?) → ProgressionSignal
```

---

## 4. Balance & Distribution Analytics

### 4.1 Muscle Group Distribution

- Volume per muscle group (weekly)
- % distribution across muscle groups
- Over/under-emphasis detection

**Implementation**: `src/hooks/usePersonalRecords.ts`
```typescript
useMuscleGroupStats() → { muscleData: { group, volume, color }[] }
```

### 4.2 Movement Pattern Balance

| Pattern Pair | Healthy Ratio |
|--------------|---------------|
| Push vs Pull | 1:1 to 1:1.5 |
| Upper vs Lower | Varies by goal |
| Squat vs Hinge | Depends on program |

Resolution: week / block

**Implementation**: `src/hooks/usePersonalRecords.ts`
```typescript
useMovementPatternBalance() → {
  pushVolume, pullVolume,
  upperVolume, lowerVolume,
  ratios: { pushPull, upperLower }
}
```

---

## 5. Mobile-First Analytics (Simple Only)

These insights must be understood in **5 seconds or less**.

### 5.1 In-Workout / Post-Workout
- Today vs last session (same exercise)
- Best set today
- Session volume vs personal average
- Session effort label: `Low | Normal | High`

### 5.2 Motivation Signals
- PR celebrations (immediate feedback)
- Training streaks
- Weekly goal progress

### 5.3 Micro-Trends
- 7-14 session sparkline (single metric)
- No filters
- No multi-exercise dashboards

---

## 6. Web-Only Analytics (Deep Analysis)

Reserved for web app with larger screens and more processing power:

- Multi-year trends
- Volume landmarks
- Program block comparisons
- Exercise ranking tables
- Correlation matrices
- Coach dashboards
- Fatigue accumulation modeling
- PR probability prediction

---

## 7. Reports & Data Products

### 7.1 Auto-Generated Reports
- Weekly summary
- Monthly progress report
- Program block review

### 7.2 Exportable Outputs
- **JSON (Canonical)**: Full fidelity, schema-versioned, reconstructable
- **JSON (Analytics)**: Pre-computed aggregates for web visualization
- **CSV**: Flat format for spreadsheet users, computed columns marked `[calc]`
- **PDF**: Training reports (future)

---

## 8. Analytics Export Format (for Web App)

The mobile app exports an analytics-ready JSON for web consumption:

```typescript
interface AnalyticsExport {
  export_version: string;
  generated_at: string;

  // Summary stats
  summary: {
    totalWorkouts: number;
    totalVolume: number;
    totalSets: number;
    dateRange: { start: string; end: string };
  };

  // Time-series data (pre-aggregated)
  timeSeries: {
    weeklyVolume: { week: string; volume: number }[];
    weeklyFrequency: { week: string; count: number }[];
    weeklyEffort: { week: string; avgRPE: number; hardSets: number }[];
  };

  // Per-exercise analytics
  exerciseAnalytics: {
    exerciseId: string;
    name: string;
    movementPattern: string | null;
    primaryMuscles: string[];
    progressionData: { date: string; maxWeight: number; est1RM: number }[];
    prHistory: { type: PRMetric; value: number; date: string }[];
    frequency: number; // weekly average
  }[];

  // Balance metrics
  balance: {
    muscleGroupVolume: { group: string; volume: number }[];
    movementPatternVolume: { pattern: string; volume: number }[];
    pushPullRatio: number;
    upperLowerRatio: number;
  };

  // Raw canonical workouts (for web to recompute if needed)
  workouts: CanonicalWorkout[];
}
```

---

## 9. Implementation Status

### Fully Implemented
| Feature | Location |
|---------|----------|
| Set Volume | `calculations.ts:calculateSetVolume()` |
| Exercise Volume | `calculations.ts:calculateExerciseVolume()` |
| Workout Volume | `calculations.ts:calculateWorkoutVolume()` |
| Estimated 1RM (Brzycki) | `calculations.ts:calculateEstimated1RM()` |
| Estimated 1RM (Epley) | `calculations.ts:calculateEstimated1RMEpley()` |
| PR Detection | `calculations.ts:isPersonalRecord()`, `detectSetPRs()` |
| Duration Calculation | `calculations.ts:calculateDurationSeconds()` |
| Weekly Volume Trends | `usePersonalRecords.ts:useWeeklyVolume()` |
| Workout Frequency | `usePersonalRecords.ts:useWorkoutFrequency()` |
| Muscle Group Stats | `usePersonalRecords.ts:useMuscleGroupStats()` |
| Exercise Progress | `usePersonalRecords.ts:useExerciseProgress()` |
| Canonical JSON Export | `exportWorkouts.ts:exportToCanonicalJSON()` |
| CSV Export | `exportWorkouts.ts:exportToCSV()` |

### Partially Implemented
| Feature | Status | Notes |
|---------|--------|-------|
| Movement Pattern Balance | Schema ready | Hook not yet implemented |
| Exercise Frequency | Basic | Per-exercise hook needed |

### Not Yet Implemented
| Feature | Priority | Notes |
|---------|----------|-------|
| Relative Intensity | P1 | Add to calculations.ts |
| Hard Set Detection | P1 | RPE ≥ 8 OR RIR ≤ 2 |
| Effort Density | P1 | volume / duration |
| Fatigue Index | P2 | avgRPE × totalSets |
| Progression Signals | P2 | Trend detection |
| Training Streaks | P2 | Consecutive weeks tracking |
| Analytics Export | P1 | Web app integration |

---

## 10. Non-Goals (Explicit)

- No real-time coaching logic in mobile app
- No storing computed metrics (always calculate)
- No mobile dashboards with dense charts
- No breaking schema for new analytics

---

## 11. Guiding Principle

> **Mobile is for acting. Web is for thinking.**

If you need to explain what an insight means, it's for the web.
