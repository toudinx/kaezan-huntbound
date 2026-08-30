import { describe, expect, it } from 'vitest';
import type {
  CharacterDefinition,
  ContentKey,
  HuntId,
} from '../../../../packages/contracts/src/index.ts';

import { huntCharacterKey, readHuntCharacter } from './readHuntCharacter.ts';

const rotworm: CharacterDefinition = {
  stableKey: 'character:huntbound:knight-venore-rotworm-cave',
  vocationKey: 'vocation:tibia:knight' as ContentKey,
  level: 8,
  skills: { sword: 10, magic: 0 },
  weaponItemKey: 'item:tibia:sword' as ContentKey,
  weaponAttack: 14,
  maxHealth: 185,
  maxMana: 185,
  spellKeys: [],
};

const cyclopolis: CharacterDefinition = {
  ...rotworm,
  stableKey: 'character:huntbound:knight-cyclopolis',
  level: 45,
  maxHealth: 740,
};

const hunt = {
  huntId: 'hunt:tibia:venore-rotworm-cave' as HuntId,
  soloVocation: 'vocation:tibia:knight',
};

describe('readHuntCharacter', () => {
  it('resolves the hunt-specific character even when another knight is listed first', () => {
    expect(readHuntCharacter([cyclopolis, rotworm], hunt)).toBe(rotworm);
  });

  it('throws the hunt character key when that sheet is missing, without falling back to vocation', () => {
    const characterKey = huntCharacterKey(hunt);

    expect(() => readHuntCharacter([cyclopolis], hunt)).toThrow(
      `Generated catalog is missing character ${characterKey}`,
    );
  });
});
