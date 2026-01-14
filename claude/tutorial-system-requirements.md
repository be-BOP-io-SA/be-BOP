# Tutorial System Requirements

*Captured from planning session on 2025-01-05*

---

## Vision

Build a comprehensive tutorial/e-learning system using Shepherd.js that provides:
- New user onboarding
- Feature discovery for existing users
- Contextual help on specific pages
- A flexible system serving multiple purposes

---

## User Requirements

### Core Functionality

1. **Multi-tutorial support**
   - Store many tutorials with a default "onboarding" tutorial
   - Each tutorial has multiple steps across different pages
   - Support for different trigger types (first-login, page-visit, manual, after-tutorial)

2. **User roles and tutorial flow**
   - Super-admin (first user with super-admin role, auto-created on deploy) goes through tutorials first
   - Super-admin can configure tutorial policy for employees:
     - Mandatory: employees must complete tutorials
     - Optional: employees can skip
     - Disabled: tutorials not shown to employees
   - Policy can be set globally AND per-tutorial (tutorial-level overrides global)

3. **Progress tracking**
   - Track completion status per user: `pending`, `in_progress`, `completed`, `skipped`
   - Users can re-run tutorials if they want
   - Track which tutorial version was completed (for re-run detection on updates)

4. **Time tracking**
   - Track total time per tutorial
   - Track time per individual step
   - Both for analytics purposes

### Tutorial Behavior

1. **Trigger mechanism**
   - On first admin login, the "onboarding" tutorial is launched automatically
   - Some tutorials triggered on first visit to specific pages
   - Some tutorials triggered after completing another tutorial
   - Some tutorials accessible through selfcare interface

2. **Skip functionality**
   - Users can skip tutorials (unless policy is mandatory)
   - Skipped tutorials marked as `skipped` status

3. **User interaction**
   - Tutorial highlights what to click/fill
   - User performs actions themselves (not auto-navigate)
   - Tutorial waits for user action before proceeding

4. **Browser close handling**
   - If user closes browser mid-tutorial, mark as `wasInterrupted: true`
   - On next login, show "You have an incomplete tutorial" prompt
   - User can resume, start over, or skip

5. **Version-based re-run**
   - When tutorial version is updated, users who completed older version can be prompted to re-run

### First Tutorial: Super-Admin Onboarding

The initial onboarding for super-admin should cover:

1. **Settings > ARM page**
   - Fill recovery npub
   - Save

2. **Node Management > Nostr page**
   - Generate NSec
   - Save

3. **Settings > Generals (config) page**
   - Set admin-hash
   - Save

4. **Settings > Identity page**
   - Fill mandatory information
   - Save

### Technical Requirements

1. **i18n integration**
   - Use existing i18n system (JSON files in `src/lib/translations/`)
   - Tutorial titles and text stored as i18n keys

2. **Database storage**
   - Tutorials stored in database (not hardcoded)
   - No admin UI for managing tutorials initially (direct DB)
   - Admin UI for tutorial management will come later

3. **Navigation handling**
   - Fix Shepherd.js issue with SvelteKit navigation
   - Tour should survive page navigations
   - Use `beforeNavigate`/`afterNavigate` hooks

4. **Scope**
   - Design for all pages (admin, POS, storefront)
   - Implement admin/employee only initially

---

## Implementation Notes

- New branch: `poc-shepherd-exploration` (from `poc-shepherd`)
- Documentation stored in `/claude` folder (tracked in git)
- Database model reviewed and approved before implementation
