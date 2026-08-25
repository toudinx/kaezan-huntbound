import {
  playfieldArcBand,
  playfieldInsets,
  playfieldRailBand,
  playfieldRect,
} from '../../hunt/playfieldViewport';

/**
 * The frame the rest of the HUD hangs on.
 *
 * Before this the shell stacked a header, an aside, a d-pad, a combat panel and
 * a save panel as five absolutely positioned siblings that happened not to
 * overlap. There was no layout to reason about, so "does chrome cover the play
 * area?" had no answer short of measuring pixels in a browser.
 *
 * Now there is one. `playfieldViewport` says how much of each edge the frame
 * claims; this publishes those measures as custom properties on a single
 * element, and every band -- including the ones the stylesheet places inside
 * `combat-root` -- is sized from them by inheritance. The stylesheet never
 * writes a band measure of its own, which is what keeps it agreeing with the
 * camera about where the play area stops.
 */
export interface CockpitRegions {
  /** Telemetry, the save strip, and the rail's overflow on a phone. */
  readonly top: HTMLElement;
  /** The d-pad, in the bottom-left corner of the deck band. */
  readonly movement: HTMLElement;
  /**
   * The free area itself: transparent, inert, and never a parent of anything.
   * It exists so the geometry the camera uses can be measured from the page.
   */
  readonly playfield: HTMLElement;
}

export interface Cockpit extends CockpitRegions {
  readonly element: HTMLElement;
  /** Recomputes the bands for the current viewport. */
  refresh(): void;
  destroy(): void;
}

export interface CockpitOptions {
  /** Injected so the bands can be driven by hand in tests. */
  readonly viewportSize?: () => {
    readonly width: number;
    readonly height: number;
  };
  readonly onResize?: (listener: () => void) => () => void;
}

function region(
  document: Document,
  testId: string,
  className: string,
): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('data-testid', testId);
  element.className = className;
  return element;
}

export function mountCockpit(
  root: HTMLElement,
  options: CockpitOptions = {},
): Cockpit {
  const document = root.ownerDocument;
  const element = region(document, 'cockpit', 'cockpit');
  const top = region(document, 'cockpit-top', 'cockpit__top');
  const movement = region(document, 'cockpit-movement', 'cockpit__movement');
  const playfield = region(document, 'cockpit-playfield', 'cockpit__playfield');

  element.append(playfield, top, movement);
  root.append(element);

  const viewportSize =
    options.viewportSize ??
    (() => {
      const view = document.defaultView;
      return { width: view?.innerWidth ?? 0, height: view?.innerHeight ?? 0 };
    });

  const refresh = (): void => {
    const size = viewportSize();
    if (!(size.width > 0) || !(size.height > 0)) return;

    const insets = playfieldInsets(size);
    const rect = playfieldRect(size);
    // The side bands are wider than the arcs now that the play window is capped
    // and centred, so the arc and rail widths are asked for rather than
    // inferred from the insets. The stylesheet hangs each arc off the play
    // window's own edge, which is what keeps the two curves beside the knight
    // instead of out at the corners of a wide monitor.
    const arc = playfieldArcBand(size);
    const rail = playfieldRailBand(size);
    const style = element.style;

    style.setProperty('--cockpit-top', `${insets.top}px`);
    style.setProperty('--cockpit-right', `${insets.right}px`);
    style.setProperty('--cockpit-bottom', `${insets.bottom}px`);
    style.setProperty('--cockpit-left', `${insets.left}px`);
    style.setProperty('--cockpit-arc', `${arc}px`);
    style.setProperty('--cockpit-rail', `${rail}px`);
    style.setProperty('--playfield-x', `${rect.x}px`);
    style.setProperty('--playfield-y', `${rect.y}px`);
    style.setProperty('--playfield-width', `${rect.width}px`);
    style.setProperty('--playfield-height', `${rect.height}px`);
    // With no room for a rail the panels it holds fold into the top band, so
    // the stylesheet needs to know which of the two layouts it is drawing.
    element.setAttribute('data-cockpit-rail', rail > 0 ? 'on' : 'off');
  };

  refresh();

  const subscribe =
    options.onResize ??
    ((listener: () => void) => {
      const view = document.defaultView;
      if (view === null || view === undefined) return () => undefined;
      view.addEventListener('resize', listener);
      view.addEventListener('orientationchange', listener);
      return () => {
        view.removeEventListener('resize', listener);
        view.removeEventListener('orientationchange', listener);
      };
    });
  const unsubscribe = subscribe(refresh);

  let destroyed = false;

  return {
    element,
    top,
    movement,
    playfield,
    refresh,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      element.remove();
    },
  };
}
