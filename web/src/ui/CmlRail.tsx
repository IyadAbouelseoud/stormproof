import React from 'react';
import { useI18n } from '../i18n';
import { useNavigation, SCREEN_METADATA, ScreenId } from '../navigation';

export interface CmlStepItem {
  id: string;
  stepIndex: number;
  labelKey: string;
  targetScreen: ScreenId;
}

export const CML_STEPS: readonly CmlStepItem[] = [
  {
    id: 'cocktail_napkin',
    stepIndex: 0,
    labelKey: 'cml.cocktail_napkin',
    targetScreen: 'Brief',
  },
  {
    id: 'initial_feasibility',
    stepIndex: 1,
    labelKey: 'cml.initial_feasibility',
    targetScreen: 'Build',
  },
  {
    id: 'trade_space',
    stepIndex: 2,
    labelKey: 'cml.trade_space',
    targetScreen: 'Orbit',
  },
  {
    id: 'point_design',
    stepIndex: 3,
    labelKey: 'cml.point_design',
    targetScreen: 'Launch',
  },
] as const;

function CmlStepIcon({ id }: { id: string }): React.JSX.Element {
  const p = {
    className: 'cml-brass-tick',
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.2,
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };
  switch (id) {
    case 'cocktail_napkin':
      return (
        <svg {...p}>
          <polygon points="2,3 14,3 14,11 6,11 2,7" />
          <line x1="6" y1="11" x2="2" y2="7" />
        </svg>
      );
    case 'initial_feasibility':
      return (
        <svg {...p}>
          <rect x="4" y="4" width="8" height="8" rx="1" />
          <line x1="2" y1="8" x2="4" y2="8" />
          <line x1="12" y1="8" x2="14" y2="8" />
        </svg>
      );
    case 'trade_space':
      return (
        <svg {...p}>
          <ellipse cx="8" cy="8" rx="6" ry="3" transform="rotate(-30 8 8)" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'point_design':
      return (
        <svg {...p}>
          <path d="M 8 2 L 12 7 L 10 13 L 6 13 L 4 7 Z" />
          <circle cx="8" cy="7" r="1.5" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <rect x="6" y="1" width="4" height="14" rx="1" fill="currentColor" />
        </svg>
      );
  }
}

export function CmlRail(): React.JSX.Element {
  const { t } = useI18n();
  const { currentScreen, setScreen } = useNavigation();
  const currentCmlIndex = SCREEN_METADATA[currentScreen].cmlStepIndex;

  return (
    <nav className="cml-rail" aria-label={t('cml.rail_label')}>
      <div className="cml-rail-track" aria-hidden="true">
        <div className="cml-rail-progress" style={{ inlineSize: `${(currentCmlIndex / 3) * 100}%` }} />
      </div>
      <ol className="cml-rail-list">
        {CML_STEPS.map((step) => {
          const isCurrent = currentCmlIndex === step.stepIndex;
          const isCompleted = currentCmlIndex > step.stepIndex;

          return (
            <li
              key={step.id}
              className={`cml-rail-step ${isCurrent ? 'cml-step--current cml-step--pulse' : ''} ${isCompleted ? 'cml-step--completed' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                className="cml-rail-button"
                onClick={() => setScreen(step.targetScreen)}
              >
                <span className="cml-brass-tick-container" aria-hidden="true">
                  <CmlStepIcon id={step.id} />
                </span>
                <span className="cml-step-label type-label">
                  {t(step.labelKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
