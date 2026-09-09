import type {
  AbilityDefinition,
  EntityId,
  SimulationCommand,
} from '../../../../packages/contracts/src/index.ts';
import type { InputAction } from '../input/InputMap';

export interface CombatInputContext {
  readonly playerEntityId: EntityId;
  readonly targetEntityId: EntityId | null;
  readonly abilities: readonly AbilityDefinition[];
}

type CombatAction = Extract<InputAction, { readonly kind: 'cast-ability' }>;

export function combatCommandForAction(
  action: CombatAction,
  context: CombatInputContext,
): SimulationCommand | undefined {
  switch (action.kind) {
    case 'cast-ability': {
      const ability = context.abilities[action.abilityIndex];
      if (ability === undefined) return undefined;

      const needsTarget =
        ability.shape === 'target' || ability.shape === 'target-area';
      const targetEntityId = needsTarget ? context.targetEntityId : null;
      if (needsTarget && targetEntityId === null) {
        return undefined;
      }

      return {
        type: 'actor/cast-ability',
        entityId: context.playerEntityId,
        abilityIndex: action.abilityIndex,
        targetEntityId,
      };
    }
  }
}
