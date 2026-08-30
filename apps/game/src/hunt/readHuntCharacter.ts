import type {
  CharacterDefinition,
  HuntIndexEntry,
} from '../../../../packages/contracts/src/index.ts';

export function huntSlug(huntId: string): string {
  const slug = huntId.split(':').at(-1) ?? huntId;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Hunt key does not end in a kebab-case slug: ${huntId}`);
  }
  return slug;
}

export function huntCharacterKey(
  hunt: Pick<HuntIndexEntry, 'huntId' | 'soloVocation'>,
): string {
  const vocationSlug = hunt.soloVocation.split(':').at(-1);
  if (vocationSlug === undefined || vocationSlug.length === 0) {
    throw new Error(
      `Hunt ${hunt.huntId} has no vocation slug for character resolution`,
    );
  }

  return `character:huntbound:${vocationSlug}-${huntSlug(hunt.huntId)}`;
}

export function readHuntCharacter(
  characters: readonly CharacterDefinition[],
  hunt: Pick<HuntIndexEntry, 'huntId' | 'soloVocation'>,
): CharacterDefinition {
  const characterKey = huntCharacterKey(hunt);
  const character = characters.find(
    (candidate) => candidate.stableKey === characterKey,
  );
  if (character === undefined) {
    throw new Error(`Generated catalog is missing character ${characterKey}`);
  }

  return character;
}
