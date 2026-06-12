# be-BOP exit codes

When be-BOP exits, the code it returns can be interpreted by a supervising
orchestrator (such as `be-bop-tooling`) as a request for a specific action.
This file is the source of truth for the contract. Orchestrator
implementations align on what is documented here.

The constants matching this table live in `src/lib/server/exit-codes.ts`.

## Nomenclature (v1)

| Code        | Meaning                                                        | Expected orchestrator action                                                             |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `0`         | Clean shutdown — be-BOP requests not to be restarted           | Do not restart                                                                           |
| `100`       | Restart requested (covers "apply override S3", "reload config") | Restart be-BOP on the same version                                                       |
| `101`       | Update to the latest public release                             | Pull/select the latest public GitHub release for be-BOP and start with it                |
| `110`–`119` | Rollback to N-k (110 = N-1, …, 119 = N-10)                     | Restore the N-k public release and start with it (N being the current public release)    |
| `102`–`109` | Reserved for future extensions                                  | Treat as unknown                                                                         |
| `120`–`125` | Reserved for future extensions                                  | Treat as unknown                                                                         |
| any other   | Out of nomenclature (Node errors `1`, `2`, signal exits `137`, `143`, …) | Standard supervisor behavior (e.g. `Restart=always` / `on-failure`)                       |

## Semantics

- **Exit 0 is strict.** It means "do not restart". The orchestrator should run
  with `Restart=on-failure` (or equivalent). The only intentional exit 0 in the
  codebase today is the SIGINT cleanup in
  `src/lib/server/runtime-config.ts`. Any new `process.exit(0)` must be
  reviewed because it would take down a managed tenant.
- **Exit 100** is the catch-all "restart me as-is" signal. It is what the
  `Restart be-BOP` button on `/admin/be-bop` emits, and what a successful
  S3 override application uses (the override file is re-read at next boot).
- **Exit 101 / 110-119** require an orchestrator that knows about be-BOP's
  release history. Without one, these codes behave the same as a regular
  process exit (the supervisor either restarts on the current release or
  doesn't restart at all). The feature is gracefully unavailable, not broken.
- **N-k is computed against the 10 latest public GitHub releases** of be-BOP,
  not against the tenant's local install history. The orchestrator queries
  GitHub to resolve k. If a release has been deleted between two rollbacks,
  live renumbering naturally absorbs it (ex-N-4 becomes N-3, etc.).
- **k outside the available range** (e.g. `119` requested but fewer than 10
  releases exist) is an explicit failure on the orchestrator side, not a
  silent fallback. Notify and let the operator pick a smaller k.

## Graceful degradation

| Supervisor                                                  | What still works                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `be-bop-tooling` orchestrator (`Restart=on-failure`)         | Full nomenclature                                                          |
| Generic `pm2` default / `docker --restart=always`            | Restart (100) works; update/rollback degrade to plain restart on current version |
| Bare `node build/index.js` (no supervisor)                   | be-BOP exits and stays down; merchant restarts manually                    |

## Security boundary

The exit code is the only signal be-BOP can send to the orchestrator. There is
no return channel. The orchestrator does not consume any data from be-BOP
other than the exit status. Configuration of the override (used at next boot)
flows through the merchant's S3, not through any direct orchestrator channel.

## Adding a new code

1. Pick the next free slot in the `100`–`125` range (or define a new range,
   `200+`, with a documented break in semantics).
2. Add a named constant in `src/lib/server/exit-codes.ts`.
3. Update this document.
4. Cross-update the orchestrator implementation. Releases should be aligned
   so that an orchestrator never sees a code it does not understand from a
   newer be-BOP.
