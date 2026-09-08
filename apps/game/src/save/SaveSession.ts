import {
  type ActiveRunState,
  type CharacterProgress,
  createEmptyCharacterProgress,
  createEmptyGameSave,
  type GameSave,
  type RunBagEntry,
  type SimulationSnapshot,
} from '../../../../packages/contracts/src/index.ts';
import {
  type CheckpointScheduler,
  consolidateRun,
  createCheckpointScheduler,
  decideResume,
  type ResumeDecision,
  type RunCheckpoint,
  type RunIdentity,
  type RunOutcome,
  SaveError,
  type SaveRepository,
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
  onTick(tick: number): void;
  finish(outcome: RunOutcome): Promise<void>;
  pagehide(): Promise<void>;
  export(): Promise<string>;
  import(serialized: string): Promise<void>;
  destroy(): void;
}

const EMPTY_STATE: SaveInventoryState = {
  status: 'loading',
  message: 'Loading save',
  bag: [],
  stash: [],
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
  save: Pick<GameSave, 'stash' | 'completedRuns'>,
  bag: readonly RunBagEntry[],
  status: SaveInventoryState['status'],
  message: string,
  experience: number,
): SaveInventoryState {
  return {
    status,
    message,
    bag: copyBag(bag),
    stash: copyBag(save.stash),
    completedRuns: save.completedRuns,
    character: { experience },
  };
}

function sessionFrom(
  identity: RunIdentity,
  driver: RestartableHuntDriver,
  bag: readonly RunBagEntry[],
): ActiveRunState {
  return {
    ...identity,
    snapshot: driver.snapshot(),
    bag: copyBag(bag),
  };
}

export function createSaveSession(
  repository: SaveRepository,
  options: { readonly everyTicks?: number } = {},
): SaveSessionController {
  let state = EMPTY_STATE;
  let destroyed = false;
  let activeRun: SaveRunAttachment | undefined;
  let scheduler: CheckpointScheduler | undefined;
  let latestBag: readonly RunBagEntry[] = [];
  let latestExperience = 0;
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
    session: sessionFrom(run.identity, run.driver, latestBag),
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
    publish({ ...state, character: { experience: latestExperience } });
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
              completedRuns: draft.completedRuns,
            };
          });
          save = {
            ...save,
            stash: consolidated.stash,
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

      latestBag = copyBag(bag);
      latestExperience = save.character.experience;
      const status = loadFailed || state.status === 'error' ? 'error' : 'ready';
      const message =
        status === 'error'
          ? state.message
          : decision.kind === 'resume'
            ? 'Run resumed'
            : decision.kind === 'discard'
              ? 'Incompatible run discarded'
              : 'New run started';
      publish(saveState(save, latestBag, status, message, latestExperience));

      return {
        decision,
        driver,
        bag: copyBag(latestBag),
        character: { experience: latestExperience },
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
        const session = sessionFrom(run.identity, run.driver, finalBag);
        // The character is written on the way out whatever the outcome. It is
        // the one thing a death does not cost, so banking it here -- outside
        // `consolidateRun`, which only decides what the *run* was worth -- is
        // what keeps the last kills before dying.
        const character = { experience: latestExperience };
        const result = await repository.transact((draft) => {
          draft.session = session;
          draft.character = character;
          consolidateRun(draft, outcome);
          return {
            stash: copyBag(draft.stash),
            completedRuns: draft.completedRuns,
          };
        });
        latestBag = [];
        publish(
          saveState(
            result,
            [],
            'ready',
            finishMessages[outcome],
            latestExperience,
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
        publish(saveState(save, latestBag, 'ready', 'Save replaced'));
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
