# Browser asset contract

PB-02-06 makes the validated asset catalog a prerequisite for the Huntbound
browser shell. The game consumes stable keys and renderer-agnostic descriptors;
pack and media paths remain inside the provider boundary.

## Bootstrap

The application derives one profile from Vite's import.meta.env.MODE:

```
test      -> /assets/test/catalog.json
personal  -> /assets/personal/catalog.json
product   -> /assets/product/catalog.json
```

The catalog route is the only asset URL composed by the game composition root.
The provider resolves pack manifests and media paths from the validated catalog;
the shell does not name a pack, media file, atlas, or source identity.

## Boot order

The entrypoint performs the following sequence:

1. Parse the profile and compose its catalog URL.
2. Create the renderer-agnostic asset runtime.
3. Mount the initial shell and wait for runtime.preload().
4. Publish data-assets-ready="true" and the resolved count on #shell-root.
5. Install the test probe only for the test profile.
6. Create Phaser and register the existing viewport, lifecycle, and performance
   services.

The root starts with data-assets-ready="false" and count 0. A preload error
keeps those values, publishes an error phase with the provider error code when
available, and does not create a Phaser game. There is no silent visual
fallback.

## Runtime lifecycle

The runtime has three observable states:

- idle: no provider preload has completed and the key list is empty;
- loaded: the provider's preload descriptors are available and keys are sorted
  lexicographically;
- unloaded: the provider has revoked all loaded media URLs and the key list is
  empty.

The provider factory promise is created once and retained across unload/reload.
Repeated or concurrent preload calls share the same provider/load operation.
unload() calls the provider's unloadAll(), which revokes the browser media URLs
owned by the provider. A later preload reuses the provider and recreates the
resolved descriptors. Snapshots and key arrays are frozen before they are
returned.

Provider failures retain their typed error and diagnostics. The runtime does
not mark a failed load as loaded; the composition root treats the failure as
boot-blocking and actionable.

## Probe boundary

Only a test build may install the optional global:

```
window.__huntboundAssetProbe
```

The probe exposes snapshot(), unload(), and reload(). It returns frozen,
serializable state snapshots containing only state, count, and stable keys. It
does not expose the provider, registry, source identities, or browser media
URLs. personal and product builds do not create the property.

## Browser evidence

Stage the synthetic test profile and run:

```
corepack pnpm assets:stage:test
corepack pnpm --filter @huntbound/game build
corepack pnpm exec playwright test tests/e2e/asset-pack.spec.ts
```

The Playwright scenario verifies these five stable keys:

```
creature:tibia:rotworm
effect:tibia:energy-hit
item:tibia:gold-coin
missile:tibia:energy-ball
outfit:tibia:knight
```

It also derives expected media request URLs by reading the served catalog and
pack manifests, then verifies unload to zero, reload to the same five keys, no
console/page/network errors, and readiness within the existing five-second
budget.

