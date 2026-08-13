import type { EntityId, Seed, StreamLabel, TickIndex } from './identity';

const rawNumber: number = 1;
const rawString: string = '0f1e2d3c4b5a6978';

// @ts-expect-error Branded IDs must not accept an unparsed number.
const invalidTick: TickIndex = rawNumber;
// @ts-expect-error Branded IDs must not accept an unparsed number.
const invalidEntity: EntityId = rawNumber;
// @ts-expect-error Branded strings must not accept an unparsed string.
const invalidSeed: Seed = rawString;
// @ts-expect-error Branded strings must not accept an unparsed string.
const invalidLabel: StreamLabel = rawString;

void invalidTick;
void invalidEntity;
void invalidSeed;
void invalidLabel;
