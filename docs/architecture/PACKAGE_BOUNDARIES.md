# Package boundaries

The dependency policy in `tools/architecture/dependency-policy.json` is the executable source of
truth. `corepack pnpm architecture:check` reads every workspace manifest and parses TypeScript import
declarations, re-exports, and literal dynamic imports with the pinned TypeScript API.

| Package | Owner and responsibility | Permitted project dependencies | Prohibited examples |
| --- | --- | --- | --- |
| `@huntbound/contracts` | Shared command, event, snapshot, and API schemas | None | `@huntbound/simulation` and every other Huntbound package |
| `@huntbound/simulation` | Deterministic, serializable game rules | `@huntbound/contracts` | Phaser, `node:fs`, DOM libraries, presentation packages |
| `@huntbound/content` | Validated game data and offline loaders | `@huntbound/contracts` | Simulation mutation, Phaser scenes |
| `@huntbound/assets` | Asset manifests, packs, and providers | `@huntbound/contracts` | Simulation state, Phaser scenes |
| `@huntbound/save` | Versioned local save repository | `@huntbound/contracts`, `@huntbound/simulation` | Phaser scenes, content importers |
| `@huntbound/test-fixtures` | Deterministic seeds, command logs, and golden hashes | `@huntbound/contracts`, `@huntbound/simulation` | Phaser, DOM UI, runtime state |
| `@huntbound/game` | Browser composition root and presentation adapters | All V0 packages except test fixtures | Gameplay rules in scenes, direct asset paths in domain code |

External imports must be declared in the importing package manifest. Declaring a dependency that is
not used does not fail the gate. The simulation package allows no external dependency: its effective
TypeScript `lib` cannot contain DOM, and it cannot declare or import a listed DOM library or any Node
builtin. Add a newly identified DOM-dependent library to the policy before introducing it to any
package.

The gate reports the source file, line, import, and violated rule so a boundary failure can be fixed at
the import or manifest that introduced it.
