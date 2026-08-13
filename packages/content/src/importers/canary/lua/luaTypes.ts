export interface CanaryAttackDto {
  readonly name: string;
  readonly kind: 'melee' | 'ranged' | 'area';
  readonly intervalMs: number;
  readonly chanceBasisPoints: number;
  readonly damageType: string;
  readonly minDamage: number;
  readonly maxDamage: number;
  readonly rangeTiles?: number;
  readonly projectile?: string;
  readonly radiusTiles?: number;
}

export interface CanaryDefenseDto {
  readonly kind: 'heal';
  readonly intervalMs: number;
  readonly chanceBasisPoints: number;
  readonly minAmount: number;
  readonly maxAmount: number;
}

export interface CanaryConditionDto {
  readonly kind: 'poison';
  readonly totalDamage: number;
  readonly intervalMs: number;
}

export interface CanarySummonDto {
  readonly creatureRef:
    | { readonly sourceId: string }
    | { readonly sourceName: string };
  readonly count: number;
  readonly chanceBasisPoints: number;
}

export interface CanaryCreatureDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly stats: {
    readonly health: number;
    readonly experience: number;
    readonly speed: number;
  };
  readonly lookType: number;
  readonly attacks: readonly CanaryAttackDto[];
  readonly defenses: readonly CanaryDefenseDto[];
  readonly conditions: readonly CanaryConditionDto[];
  readonly summons: readonly CanarySummonDto[];
  readonly lootRefs: readonly (
    | { readonly sourceId: string }
    | { readonly sourceName: string }
  )[];
  readonly elements: Readonly<Record<string, number>>;
  readonly immunities: readonly string[];
}

export interface CanarySpellDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly words: string;
  readonly level: number;
  readonly mana: number;
  readonly cooldownMs: number;
  readonly groupCooldownMs: number;
  readonly vocationNames: readonly string[];
  readonly damageType: string;
  readonly area: { readonly shape: 'square'; readonly radius: number };
  readonly formula: {
    readonly kind: 'skillAttack';
    readonly levelFactor: number;
    readonly minSkillAttackFactor: number;
    readonly maxSkillAttackFactor: number;
    readonly finalMultiplier: number;
  };
}
