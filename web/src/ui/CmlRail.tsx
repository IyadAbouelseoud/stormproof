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
              className={`cml-rail-step ${isCurrent ? 'cml-step--current' : ''} ${isCompleted ? 'cml-step--completed' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                className="cml-rail-button"
                onClick={() => setScreen(step.targetScreen)}
              >
                <span className="cml-brass-tick-container" aria-hidden="true">
                  <svg
                    className="cml-brass-tick"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="6"
                      y="1"
                      width="4"
                      height="14"
                      rx="1"
                      fill="currentColor"
                    />
                  </svg>
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
