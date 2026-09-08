import {
  type ActiveRunState,
  type BestiarySpecies,
  type CharacterProgress,
  createEmptyCharacterProgress,
  createEmptyGameSave,
  type GameSave,
  type RunBagEntry,
  type SimulationSnapshot,
} from '../../../../packages/contracts/src/index.ts';
import {
  activateNextHuntBuff,
  type BestiaryCreditResult,
  type CheckpointScheduler,
  consolidateRun,
  createCheckpointScheduler,
  creditBestiaryKill,
  decideResume,
  type ResumeDecision,
  type RunCheckpoint,
  type RunIdentity,
  type RunOutcome,
  type SaleResult,
  SaveError,
  type SaveRepository,
  type SellItemDetails,
  sellFromStash,
} from '../../../../packages/save/src/index.ts';

import type { RestartableHuntDriver } from '../hunt/RestartableHuntDriver';
import type { SaveInventoryState, SaveStateSource } from './SaveState';

export interface SaveSessionBootOptions {
  readonly identity: RunIdentity;
  readonly createDriver: (
    snapshot: SimulationSnapshot | undefined,
  ) => RestartableHuntDriver;
}

export interface SaveSessionBootResult {
  readonly decision: ResumeDecision;
  readonly driver: RestartableHuntDriver;
  readonly bag: readonly RunBagEntry[];
  readonly character: CharacterProgress;
}

export interface SaveRunAttachment {
  readonly identity: RunIdentity;
  readonly driver: RestartableHuntDriver;
  readonly getBag: () => readonly RunBagEntry[];
  /** The character's total experience, read where the bag is read. */
  readonly getExperience: () => number;
}

export interface SaveSessionController extends SaveStateSource {
  boot(options: SaveSessionBootOptions): Promise<SaveSessionBootResult>;
  attachRun(run: SaveRunAttachment): void;
  updateBag(bag: readonly RunBagEntry[]): void;
  updateExperience(experience: number): void;
  recordBestiaryKill(
    creatureKey: string,
    eventSequence: number,
  ): Promise<BestiaryCreditResult>;
  onTick(tick: number): void;
  finish(outcome: RunOutcome): Promise<void>;
  sell(
    itemKey: string,
    quantity: number,
    allowProtected?: boolean,
  ): Promise<SaleResult>;
  pagehide(): Promise<void>;
  export(): Promise<string>;
  import(serialized: string): Promise<void>;
  destroy(): void;
}

export interface SaveSessionOptions {
  readonly everyTicks?: number;
  /** Resolves catalog pricing and collection protection without coupling save to content. */
  readonly resolveSellItem?: (itemKey: string) => SellItemDetails | undefined;
  /** The seven catalogued species and their one account milestone each. */
  readonly bestiary?: readonly BestiarySpecies[];
}

const EMPTY_STATE: SaveInventoryState = {
  status: 'loading',
  message: 'Loading save',
  bag: [],
  stash: [],
  gold: 0,
  nextHuntBuff: 'none',
  completedRuns: 0,
  character: createEmptyCharacterProgress(),
};

const finishMessages: Record<RunOutcome, string> = {
  completed: 'Run completed',
  abandoned: 'Run abandoned',
  died: 'Run lost',
};

function copyBag(bag: readonly RunBagEntry[]): readonly RunBagEntry[] {
  return bag.map((entry) => ({ ...entry }));
}

function sameBag(
  left: readonly RunBagEntry[],
  right: readonly RunBagEntry[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every(
    (entry, index) =>
      entry.itemKey === right[index]?.itemKey &&
      entry.count === right[index]?.count,
  );
}

function saleMessage(result: SaleResult, displayName?: string): string {
  const label = displayName ?? result.itemKey;
  if (result.ok) {
    return `Sold ${result.quantity} ${label} for ${result.total} gold`;
  }

  switch (result.reason) {
    case 'not-for-sale':
      return `${label} is not for sale`;
    case 'invalid-quantity':
      return 'Choose a positive whole quantity';
    case 'item-not-in-stash':
      return `${label} is not in the stash`;
    case 'insufficient-quantity':
      return `Not enough ${label} in the stash`;
    case 'protected-item':
      return `${label} is protected as a collection piece`;
    case 'invalid-price':
      return `${label} has an invalid sale price`;
    case 'invalid-wallet':
      return 'The wallet is invalid';
    case 'amount-overflow':
      return 'The sale amount is too large';
    case 'session-destroyed':
      return 'Save session is destroyed';
  }
}

/**
 * What the player is shown when a save operation fails.
 *
 * A `SaveError` leads with its code. The prose is written for a human and can
 * be reworded at any time; the code is the failure's only stable name, so it is
 * what a test can assert on, what a report can be searched for and what maps to
 * a recovery path. Dropping it left `SAVE_VERSION_UNSUPPORTED` — the one
 * failure with a real recovery — indistinguishable from a sentence.
 */
function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = 'cause' in error ? error.cause : undefined;
  const text =
    cause instanceof Error
      ? `${error.message}: ${cause.message}`
      : error.message;
  return error instanceof SaveError ? `${error.code}: ${text}` : text;
}

function saveState(
  save: Pick<GameSave, 'stash' | 'gold' | 'completedRuns' | 'nextHuntBuff'>,
  bag: readonly RunBagEntry[],
  status: SaveInventoryState['status'],
  message: string,
  character: CharacterProgress,
): SaveInventoryState {
  return {
    status,
    message,
    bag: copyBag(bag),
    stash: copyBag(save.stash),
    gold: save.gold,
    nextHuntBuff: save.nextHuntBuff,
    completedRuns: save.completedRuns,
    character,
  };
}

function sessionFrom(
  identity: RunIdentity,
  driver: RestartableHuntDriver,
  bag: readonly RunBagEntry[],
  lastBestiaryEventSequence = 0,
): ActiveRunState {
  return {
    ...identity,
    snapshot: driver.snapshot(),
    bag: copyBag(bag),
    lastBestiaryEventSequence,
  };
}

export function createSaveSession(
  repository: SaveRepository,
  options: SaveSessionOptions = {},
): SaveSessionController {
  let state = EMPTY_STATE;
  let destroyed = false;
  let activeRun: SaveRunAttachment | undefined;
  let scheduler: CheckpointScheduler | undefined;
  let latestBag: readonly RunBagEntry[] = [];
  let latestExperience = 0;
  let latestBestiaryEventSequence = 0;
  const bestiaryByKey = new Map(
    (options.bestiary ?? []).map((species) => [species.creatureKey, species]),
  );
  // The set the run started with. A run never changes it -- equipping happens
  // in the atlas -- so carrying it here keeps the panel honest without giving
  // the checkpoint a way to write it back.
  let latestCharacter: CharacterProgress = createEmptyCharacterProgress();
  let runOpen = false;
  let finishing = false;
  const listeners = new Set<(next: SaveInventoryState) => void>();

  const publish = (next: SaveInventoryState): void => {
    state = next;
    for (const listener of listeners) listener(state);
  };

  const publishError = (prefix: string, error: unknown): void => {
    publish({
      ...state,
      status: 'error',
      message: `${prefix}: ${errorText(error)}`,
    });
  };

  const publishSchedulerError = (error: SaveError): void => {
    publishError('Save checkpoint failed', error);
  };

  const captureCheckpoint = (run: SaveRunAttachment): RunCheckpoint => ({
    session: sessionFrom(
      run.identity,
      run.driver,
      latestBag,
      latestBestiaryEventSequence,
    ),
    character: { experience: latestExperience },
  });

  const disposeScheduler = (): void => {
    scheduler?.dispose();
    scheduler = undefined;
  };

  const setBag = (bag: readonly RunBagEntry[]): void => {
    const next = copyBag(bag);
    if (sameBag(latestBag, next)) return;
    latestBag = next;
    publish({ ...state, bag: copyBag(latestBag) });
  };

  const setExperience = (experience: number): void => {
    const next = Number.isFinite(experience) ? Math.max(0, experience) : 0;
    if (next === latestExperience) return;
    latestExperience = next;
    latestCharacter = { ...latestCharacter, experience: latestExperience };
    publish({ ...state, character: latestCharacter });
  };

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },

    async boot({ identity, createDriver }) {
      if (destroyed) {
        throw new Error('Save session is destroyed.');
      }

      publish({ ...EMPTY_STATE, message: 'Loading save' });
      let save: GameSave;
      let loadFailed = false;
      try {
        save = await repository.load();
      } catch (error) {
        loadFailed = true;
        save = createEmptyGameSave();
        publishError('Save load failed; starting a fresh run', error);
      }

      let decision = decideResume(save, identity);
      let bag = decision.kind === 'resume' ? decision.session.bag : [];

      if (decision.kind === 'discard') {
        try {
          const consolidated = await repository.transact((draft) => {
            consolidateRun(draft, 'abandoned');
            return {
              stash: copyBag(draft.stash),
              gold: draft.gold,
              nextHuntBuff: draft.nextHuntBuff,
              completedRuns: draft.completedRuns,
            };
          });
          save = {
            ...save,
            stash: consolidated.stash,
            gold: consolidated.gold,
            nextHuntBuff: consolidated.nextHuntBuff,
            completedRuns: consolidated.completedRuns,
            session: null,
          };
          bag = [];
        } catch (error) {
          publishError('Incompatible save could not be consolidated', error);
          bag = [];
        }
      }

      let driver: RestartableHuntDriver;
      try {
        driver = createDriver(
          decision.kind === 'resume' ? decision.session.snapshot : undefined,
        );
      } catch (error) {
        publishError(
          'Save snapshot could not be resumed; starting fresh',
          error,
        );
        driver = createDriver(undefined);
        decision = { kind: 'fresh' };
        bag = [];
      }

      if (save.nextHuntBuff === 'pending') {
        try {
          const nextHuntBuff = await repository.transact((draft) => {
            activateNextHuntBuff(draft);
            return draft.nextHuntBuff;
          });
          save = { ...save, nextHuntBuff };
        } catch (error) {
          publishError('Next-hunt blessing could not be activated', error);
        }
      }

      latestBag = copyBag(bag);
      latestExperience = save.character.experience;
      latestBestiaryEventSequence =
        decision.kind === 'resume'
          ? decision.session.lastBestiaryEventSequence
          : 0;
      latestCharacter = save.character;
      const status = loadFailed || state.status === 'error' ? 'error' : 'ready';
      const message =
        status === 'error'
          ? state.message
          : decision.kind === 'resume'
            ? 'Run resumed'
            : decision.kind === 'discard'
              ? 'Incompatible run discarded'
              : 'New run started';
      publish(saveState(save, latestBag, status, message, latestCharacter));

      return {
        decision,
        driver,
        bag: copyBag(latestBag),
        character: latestCharacter,
      };
    },

    attachRun(run) {
      if (destroyed) return;
      disposeScheduler();
      activeRun = run;
      latestBag = copyBag(run.getBag());
      runOpen = true;
      finishing = false;
      scheduler = createCheckpointScheduler(repository, {
        everyTicks: options.everyTicks ?? 200,
        onError: publishSchedulerError,
      });
      setBag(latestBag);
      setExperience(run.getExperience());
    },

    updateBag(bag) {
      setBag(bag);
    },

    updateExperience(experience) {
      setExperience(experience);
    },

    async recordBestiaryKill(creatureKey, eventSequence) {
      const species = bestiaryByKey.get(creatureKey);
      if (species === undefined) {
        return {
          credited: false,
          creatureKey,
          displayName: creatureKey,
          kills: 0,
          targetKills: 0,
          completed: false,
          rewardGold: 0,
        };
      }
      if (destroyed || !runOpen || activeRun === undefined) {
        return {
          credited: false,
          creatureKey,
          displayName: species.displayName,
          kills:
            latestCharacter.bestiary.find(
              (entry) => entry.creatureKey === creatureKey,
            )?.kills ?? 0,
          targetKills: species.targetKills,
          completed:
            (latestCharacter.bestiary.find(
              (entry) => entry.creatureKey === creatureKey,
            )?.kills ?? 0) >= species.targetKills,
          rewardGold: 0,
          reason: 'no-session',
        };
      }

      const run = activeRun;
      latestBag = copyBag(run.getBag());
      latestExperience = run.getExperience();
      try {
        const transaction = await repository.transact((draft) => {
          // The first kill may happen before the first periodic checkpoint.
          // Materialise the active run here so its event cursor is persisted
          // together with the first bestiary count.
          if (draft.session === null) {
            draft.session = sessionFrom(
              run.identity,
              run.driver,
              latestBag,
              latestBestiaryEventSequence,
            );
          }
          const credit = creditBestiaryKill(draft, species, eventSequence);
          return {
            credit,
            character: draft.character,
            stash: copyBag(draft.stash),
            gold: draft.gold,
            nextHuntBuff: draft.nextHuntBuff,
            completedRuns: draft.completedRuns,
          };
        });
        latestBestiaryEventSequence = Math.max(
          latestBestiaryEventSequence,
          eventSequence,
        );
        if (!transaction.credit.credited) {
          return transaction.credit;
        }

        latestCharacter = transaction.character;
        const message = transaction.credit.completed
          ? `Bestiary complete: ${species.displayName} (+${transaction.credit.rewardGold} gold)`
          : `Bestiary: ${species.displayName} ${transaction.credit.kills}/${transaction.credit.targetKills}`;
        publish(
          saveState(transaction, latestBag, 'ready', message, latestCharacter),
        );
        return transaction.credit;
      } catch (error) {
        publishError('Bestiary credit failed', error);
        throw error;
      }
    },

    onTick(tick) {
      if (
        destroyed ||
        !runOpen ||
        finishing ||
        activeRun === undefined ||
        scheduler === undefined
      ) {
        return;
      }

      const run = activeRun;
      try {
        latestBag = copyBag(run.getBag());
        latestExperience = run.getExperience();
        // `capture` is lazy on purpose: the scheduler only calls it on the
        // ticks that actually write. Building the session eagerly snapshotted
        // the kernel twenty times a second and discarded all but one in two
        // hundred of them.
        scheduler.onTick(tick, () => captureCheckpoint(run));
      } catch (error) {
        publishError('Save checkpoint capture failed', error);
      }
    },

    async finish(outcome) {
      if (destroyed || !runOpen || finishing || activeRun === undefined) {
        return;
      }

      const run = activeRun;
      const activeScheduler = scheduler;
      runOpen = false;
      finishing = true;

      try {
        const finalBag = copyBag(run.getBag());
        latestBag = finalBag;
        latestExperience = run.getExperience();
        await activeScheduler?.flush();
        const session = sessionFrom(
          run.identity,
          run.driver,
          finalBag,
          latestBestiaryEventSequence,
        );
        // The character is written on the way out whatever the outcome. It is
        // the one thing a death does not cost, so banking it here -- outside
        // `consolidateRun`, which only decides what the *run* was worth -- is
        // what keeps the last kills before dying.
        const result = await repository.transact((draft) => {
          draft.session = session;
          draft.character = {
            ...draft.character,
            experience: latestExperience,
          };
          consolidateRun(draft, outcome);
          return {
            stash: copyBag(draft.stash),
            gold: draft.gold,
            nextHuntBuff: draft.nextHuntBuff,
            completedRuns: draft.completedRuns,
            character: draft.character,
          };
        });
        latestBag = [];
        latestCharacter = result.character;
        latestBestiaryEventSequence = 0;
        publish(
          saveState(
            result,
            [],
            'ready',
            finishMessages[outcome],
            latestCharacter,
          ),
        );
      } catch (error) {
        publishError('Run consolidation failed', error);
      } finally {
        disposeScheduler();
        activeRun = undefined;
        finishing = false;
      }
    },

    async sell(itemKey, quantity, allowProtected = false) {
      if (destroyed) {
        return {
          ok: false,
          itemKey,
          quantity,
          reason: 'session-destroyed',
        };
      }

      const details = options.resolveSellItem?.(itemKey);
      if (details === undefined) {
        const result: SaleResult = {
          ok: false,
          itemKey,
          quantity,
          reason: 'not-for-sale',
        };
        publish({
          ...state,
          status: 'ready',
          message: saleMessage(result),
        });
        return result;
      }

      try {
        const transaction = await repository.transact((draft) => {
          const sale = sellFromStash(draft, itemKey, quantity, details, {
            allowProtected,
          });
          return {
            sale,
            stash: copyBag(draft.stash),
            gold: draft.gold,
            nextHuntBuff: draft.nextHuntBuff,
            completedRuns: draft.completedRuns,
          };
        });

        if (!transaction.sale.ok) {
          publish({
            ...state,
            status: 'ready',
            message: saleMessage(transaction.sale, details.displayName),
          });
          return transaction.sale;
        }

        publish(
          saveState(
            transaction,
            latestBag,
            'ready',
            saleMessage(transaction.sale, details.displayName),
            latestCharacter,
          ),
        );
        return transaction.sale;
      } catch (error) {
        publishError('Sale failed', error);
        throw error;
      }
    },

    pagehide() {
      return scheduler?.flush() ?? Promise.resolve();
    },

    async export() {
      try {
        return await repository.export();
      } catch (error) {
        publishError('Save export failed', error);
        throw error;
      }
    },

    async import(serialized) {
      try {
        await repository.import(serialized);
        const save = await repository.load();
        latestBag = copyBag(save.session?.bag ?? []);
        latestExperience = save.character.experience;
        latestCharacter = save.character;
        publish(
          saveState(save, latestBag, 'ready', 'Save replaced', latestCharacter),
        );
      } catch (error) {
        publishError('Save replacement failed', error);
        throw error;
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      runOpen = false;
      disposeScheduler();
      activeRun = undefined;
      listeners.clear();
    },
  };
}
