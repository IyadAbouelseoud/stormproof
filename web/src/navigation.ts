import { create } from 'zustand';
import type { RoleId } from '@stormproof/engine';
import { useMission } from './store';

export type ScreenId =
  | 'Brief'
  | 'Build'
  | 'Orbit'
  | 'Launch'
  | 'Flight'
  | 'Report'
  | 'Refly';

export type SegmentTag = 'user' | 'space' | 'ground' | 'launch';

export interface ScreenMeta {
  id: ScreenId;
  nameKey: string;
  segment: SegmentTag;
  segmentKey: string;
  cmlStepIndex: number;
}

export const SCREENS: readonly ScreenId[] = [
  'Brief',
  'Build',
  'Orbit',
  'Launch',
  'Flight',
  'Report',
  'Refly',
] as const;

export const SCREEN_METADATA: Record<ScreenId, ScreenMeta> = {
  Brief: {
    id: 'Brief',
    nameKey: 'screens.brief',
    segment: 'user',
    segmentKey: 'segment.user',
    cmlStepIndex: 0,
  },
  Build: {
    id: 'Build',
    nameKey: 'screens.build',
    segment: 'space',
    segmentKey: 'segment.space',
    cmlStepIndex: 1,
  },
  Orbit: {
    id: 'Orbit',
    nameKey: 'screens.orbit',
    segment: 'space',
    segmentKey: 'segment.space',
    cmlStepIndex: 2,
  },
  Launch: {
    id: 'Launch',
    nameKey: 'screens.launch',
    segment: 'launch',
    segmentKey: 'segment.launch',
    cmlStepIndex: 3,
  },
  Flight: {
    id: 'Flight',
    nameKey: 'screens.flight',
    segment: 'space',
    segmentKey: 'segment.space',
    cmlStepIndex: 3,
  },
  Report: {
    id: 'Report',
    nameKey: 'screens.report',
    segment: 'ground',
    segmentKey: 'segment.ground',
    cmlStepIndex: 3,
  },
  Refly: {
    id: 'Refly',
    nameKey: 'screens.refly',
    segment: 'user',
    segmentKey: 'segment.user',
    cmlStepIndex: 3,
  },
};

/** Team mode: which role owns the decisions on each screen (Flight: everyone votes). */
export const SCREEN_OWNER: Record<ScreenId, RoleId | null> = {
  Brief: 'systems-lead',
  Build: 'power-spacecraft',
  Orbit: 'orbit-comms',
  Launch: 'science',
  Flight: null,
  Report: 'systems-lead',
  Refly: 'systems-lead',
};

export interface NavigationState {
  currentScreen: ScreenId;
  /** Team mode hot-seat: the role that must take the device before the screen is shown. */
  handoverTo: RoleId | null;
  confirmHandover: () => void;
  screens: readonly ScreenId[];
  currentIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  setScreen: (screen: ScreenId) => void;
  nextScreen: () => void;
  prevScreen: () => void;
}

function handoverFor(from: ScreenId, to: ScreenId): RoleId | null {
  if (!useMission.getState().teamMode) return null;
  const a = SCREEN_OWNER[from];
  const b = SCREEN_OWNER[to];
  return b && a !== b ? b : null;
}

export const useNavigation = create<NavigationState>((set, get) => ({
  currentScreen: 'Brief',
  handoverTo: null,
  confirmHandover: () => set({ handoverTo: null }),
  screens: SCREENS,
  currentIndex: 0,
  canGoBack: false,
  canGoNext: true,
  setScreen: (screen: ScreenId) => {
    const idx = SCREENS.indexOf(screen);
    if (idx !== -1) {
      set({
        handoverTo: handoverFor(get().currentScreen, screen),
        currentScreen: screen,
        currentIndex: idx,
        canGoBack: idx > 0,
        canGoNext: idx < SCREENS.length - 1,
      });
    }
  },
  nextScreen: () => {
    const { currentIndex } = get();
    if (currentIndex < SCREENS.length - 1) {
      const nextIdx = currentIndex + 1;
      set({
        handoverTo: handoverFor(SCREENS[currentIndex]!, SCREENS[nextIdx]!),
        currentScreen: SCREENS[nextIdx]!,
        currentIndex: nextIdx,
        canGoBack: true,
        canGoNext: nextIdx < SCREENS.length - 1,
      });
    }
  },
  prevScreen: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      set({
        handoverTo: handoverFor(SCREENS[currentIndex]!, SCREENS[prevIdx]!),
        currentScreen: SCREENS[prevIdx]!,
        currentIndex: prevIdx,
        canGoBack: prevIdx > 0,
        canGoNext: true,
      });
    }
  },
}));
