# Tutorial/E-Learning System Implementation Plan

## Branch Strategy
- **New branch**: `poc-shepherd-exploration` (from `poc-shepherd`)
- Do NOT commit to `poc-shepherd`

---

## Database Model Changes

### New Collection 1: `tutorials`

Stores tutorial definitions (the "what" of each tutorial).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | `string` | Yes | Tutorial identifier (e.g., `"onboarding"`, `"product-creation"`) |
| `name` | `string` | Yes | Human-readable name |
| `description` | `string` | Yes | What this tutorial teaches |
| `version` | `number` | Yes | Version number for tracking updates (starts at 1) |
| `targetRoles` | `string[]` | Yes | Which roles see this tutorial (e.g., `["super-admin"]`) |
| `isActive` | `boolean` | Yes | Whether tutorial is currently available |
| `triggerType` | `string` | Yes | When tutorial triggers: `"first-login"`, `"page-visit"`, `"manual"`, `"after-tutorial"` |
| `triggerCondition` | `object` | No | Condition details (e.g., `{route: "/admin/product"}` or `{afterTutorialId: "onboarding"}`) |
| `steps` | `TutorialStep[]` | Yes | Array of tutorial steps (see below) |
| `estimatedTimeMinutes` | `number` | No | Estimated completion time |
| `policy` | `object` | No | Tutorial-level policy override (see below) |
| `createdAt` | `Date` | Yes | Timestamp (auto) |
| `updatedAt` | `Date` | Yes | Timestamp (auto) |

#### Embedded `TutorialPolicy` Schema (tutorial-level override)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeMode` | `string` | No | Override global: `"mandatory"`, `"optional"`, `"disabled"`, `null` (use global) |
| `allowSkip` | `boolean` | No | Override if users can skip this specific tutorial |
| `allowRerun` | `boolean` | No | Override if users can re-run this tutorial |

**Policy Resolution**: Tutorial-level settings override global settings. If tutorial-level is `null`/undefined, fall back to global `runtimeConfig.tutorialPolicy`.

#### Embedded `TutorialStep` Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Step identifier (unique within tutorial) |
| `order` | `number` | Yes | Step order (1-based) |
| `route` | `string` | Yes | Page where step appears (e.g., `"/admin/arm"`) |
| `attachTo.element` | `string` | Yes | CSS selector for Shepherd.js (e.g., `"input[name='recoveryNpub']"`) |
| `attachTo.on` | `string` | Yes | Tooltip position: `"top"`, `"bottom"`, `"left"`, `"right"`, etc. |
| `titleKey` | `string` | Yes | i18n key for step title (e.g., `"tutorial.onboarding.step1.title"`) |
| `textKey` | `string` | Yes | i18n key for step description |
| `requiredAction` | `object` | No | What user must do before proceeding |
| `requiredAction.type` | `string` | If action | `"click"`, `"input"`, `"select"`, `"form-submit"` |
| `requiredAction.selector` | `string` | If action | CSS selector of target element |
| `requiredAction.validation` | `string` | No | `"non-empty"`, `"valid-email"`, etc. |

**Example Document:**
```json
{
  "_id": "onboarding",
  "name": "Super Admin Onboarding",
  "description": "Initial setup guide for new be-BOP installations",
  "version": 1,
  "targetRoles": ["super-admin"],
  "isActive": true,
  "triggerType": "first-login",
  "triggerCondition": null,
  "estimatedTimeMinutes": 10,
  "steps": [
    {
      "id": "arm-recovery",
      "order": 1,
      "route": "/admin/arm",
      "attachTo": { "element": "input[name='recoveryNpub']", "on": "bottom" },
      "titleKey": "tutorial.onboarding.step1.title",
      "textKey": "tutorial.onboarding.step1.text",
      "requiredAction": {
        "type": "form-submit",
        "validation": "non-empty"
      }
    }
  ],
  "createdAt": "2025-01-05T...",
  "updatedAt": "2025-01-05T..."
}
```

**Indexes:**
- `{ isActive: 1 }` - Filter active tutorials
- `{ targetRoles: 1 }` - Filter by user role

---

### New Collection 2: `tutorialProgress`

Tracks each user's progress on each tutorial.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | `ObjectId` | Yes | Auto-generated |
| `userId` | `ObjectId` | Yes | Reference to `users._id` |
| `tutorialId` | `string` | Yes | Reference to `tutorials._id` |
| `tutorialVersion` | `number` | Yes | Version of tutorial user started (for re-run detection) |
| `status` | `string` | Yes | `"pending"`, `"in_progress"`, `"completed"`, `"skipped"` |
| `currentStepIndex` | `number` | Yes | Current step (0-based index) |
| `startedAt` | `Date` | No | When user started tutorial |
| `completedAt` | `Date` | No | When user completed tutorial |
| `skippedAt` | `Date` | No | When user skipped tutorial |
| `lastActiveAt` | `Date` | No | Last activity timestamp (for incomplete detection) |
| `wasInterrupted` | `boolean` | No | True if user closed browser mid-tutorial |
| `totalTimeMs` | `number` | Yes | Total time spent (milliseconds) |
| `stepTimes` | `StepTime[]` | Yes | Time tracking per step (see below) |
| `createdAt` | `Date` | Yes | Timestamp (auto) |
| `updatedAt` | `Date` | Yes | Timestamp (auto) |

#### Embedded `StepTime` Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stepId` | `string` | Yes | Reference to step ID |
| `startedAt` | `Date` | Yes | When user started this step |
| `completedAt` | `Date` | No | When user completed this step |
| `durationMs` | `number` | No | Time spent on step (milliseconds) |

**Example Document:**
```json
{
  "_id": "ObjectId(...)",
  "userId": "ObjectId(...)",
  "tutorialId": "onboarding",
  "tutorialVersion": 1,
  "status": "in_progress",
  "currentStepIndex": 2,
  "startedAt": "2025-01-05T10:00:00Z",
  "completedAt": null,
  "skippedAt": null,
  "lastActiveAt": "2025-01-05T10:15:00Z",
  "wasInterrupted": false,
  "totalTimeMs": 900000,
  "stepTimes": [
    { "stepId": "arm-recovery", "startedAt": "...", "completedAt": "...", "durationMs": 120000 },
    { "stepId": "nostr-nsec", "startedAt": "...", "completedAt": "...", "durationMs": 180000 },
    { "stepId": "config-hash", "startedAt": "...", "completedAt": null, "durationMs": null }
  ],
  "createdAt": "2025-01-05T10:00:00Z",
  "updatedAt": "2025-01-05T10:15:00Z"
}
```

**Indexes:**
- `{ userId: 1, tutorialId: 1 }` (unique) - One progress record per user per tutorial
- `{ userId: 1, status: 1 }` - Find user's incomplete tutorials
- `{ status: 1, wasInterrupted: 1 }` - Find interrupted tutorials

---

### Configuration Addition to `runtimeConfig`

Add to existing `runtimeConfig` (not a new collection):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tutorialPolicy.employeeTutorialMode` | `string` | `"optional"` | Global default: `"mandatory"`, `"optional"`, `"disabled"` |
| `tutorialPolicy.autoLaunchOnboarding` | `boolean` | `true` | Auto-start onboarding for new users |
| `tutorialPolicy.showIncompletePrompt` | `boolean` | `true` | Show "resume tutorial?" prompt |
| `tutorialPolicy.allowSkip` | `boolean` | `true` | Global default: allow users to skip tutorials |
| `tutorialPolicy.allowRerun` | `boolean` | `true` | Global default: allow users to re-run tutorials |

**Note**: These are global defaults. Individual tutorials can override via their `policy` field.

---

## Status Flow Diagram

```
User First Login
      |
      v
  +---------+     User clicks "Skip"     +---------+
  | pending | --------------------------> | skipped |
  +----+----+                            +---------+
       |
       | User clicks "Start"
       v
  +-------------+
  | in_progress |<------------------+
  +------+------+                   |
         |                          |
    +----+----+                     |
    v         v                     |
Browser   Completes              Resume
 Close    All Steps              Tutorial
    |         |                     |
    v         v                     |
wasInterrupted  +-----------+       |
  = true        | completed |       |
    |           +-----------+       |
    |                               |
    +------> "Resume?" prompt ------+
```

---

## Implementation Phases

### Phase 0: Project Setup
1. Create branch `poc-shepherd-exploration` from `poc-shepherd`
2. Create `/claude` folder at project root (tracked in git)
3. Add `/claude/tutorial-system-plan.md` with this plan
4. Add `/claude/tutorial-system-requirements.md` with user requirements from this session

### Phase 1: Database & Types
1. Create `src/lib/types/Tutorial.ts`
2. Create `src/lib/types/TutorialProgress.ts`
3. Add collections to `src/lib/server/database.ts`
4. Add migration for initial "onboarding" tutorial

### Phase 2: Store & Navigation Fix
1. Create `src/lib/stores/tutorial.ts`
2. Fix Shepherd.js navigation issue using `beforeNavigate`/`afterNavigate`

### Phase 3: Components
1. `TutorialProvider.svelte` - Main orchestrator
2. `TutorialPrompt.svelte` - Start/Resume/Skip modal
3. `TutorialProgress.svelte` - Visual progress bar

### Phase 4: Server Integration
1. API routes for progress tracking
2. Login hook for auto-trigger
3. Tutorial policy in runtimeConfig

### Phase 5: i18n & First Tutorial
1. Add translation keys to all language files
2. Implement super-admin onboarding tutorial steps

---

## Files to Create

```
src/lib/types/Tutorial.ts
src/lib/types/TutorialProgress.ts
src/lib/stores/tutorial.ts
src/lib/components/tutorial/TutorialProvider.svelte
src/lib/components/tutorial/TutorialPrompt.svelte
src/lib/components/tutorial/TutorialProgress.svelte
src/routes/api/tutorial/progress/+server.ts
```

## Files to Modify

```
src/lib/server/database.ts - Add collections
src/lib/server/runtime-config.ts - Add tutorialPolicy
src/routes/(app)/admin[[hash=admin_hash]]/+layout.svelte - Add TutorialProvider
src/routes/(app)/admin[[hash=admin_hash]]/+layout.server.ts - Load tutorial data
src/lib/translations/en.json (+ other locales) - Add translation keys
```

---

## Questions Resolved

- **Navigation handling**: Use `beforeNavigate` to pause tour, `afterNavigate` to resume
- **User interaction**: User performs actions, tutorial only highlights
- **Browser close**: Mark `wasInterrupted: true`, show resume prompt on next login
- **Version tracking**: Compare `tutorialProgress.tutorialVersion` vs `tutorial.version`
- **Time tracking**: Both `totalTimeMs` and per-step `stepTimes[]`
