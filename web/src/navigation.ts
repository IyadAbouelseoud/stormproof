import { create } from 'zustand';

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

export interface NavigationState {
  currentScreen: ScreenId;
  screens: readonly ScreenId[];
  currentIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  setScreen: (screen: ScreenId) => void;
  nextScreen: () => void;
  prevScreen: () => void;
}

export const useNavigation = create<NavigationState>((set, get) => ({
  currentScreen: 'Brief',
  screens: SCREENS,
  currentIndex: 0,
  canGoBack: false,
  canGoNext: true,
  setScreen: (screen: ScreenId) => {
    const idx = SCREENS.indexOf(screen);
    if (idx !== -1) {
      set({
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
        currentScreen: SCREENS[nextIdx],
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
        currentScreen: SCREENS[prevIdx],
        currentIndex: prevIdx,
        canGoBack: prevIdx > 0,
        canGoNext: true,
      });
    }
  },
}));
