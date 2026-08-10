export type ShellPhase = 'booting' | 'ready' | 'paused' | 'error';

export type RendererKind = 'webgl' | 'canvas' | 'unavailable';

export interface ShellSnapshot {
  readonly phase: ShellPhase;
  readonly renderer: RendererKind;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly devicePixelRatio: number;
  };
  readonly message: string;
}
