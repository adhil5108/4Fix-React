import { useTranslation } from 'react-i18next';

// `labelKey` is translated at render; a caller-supplied step may pass a ready `label` instead.
export const BOOKING_STEPS = [
  { key: 'service', labelKey: 'cards.steps.service' },
  { key: 'issue', labelKey: 'cards.steps.issue' },
  { key: 'details', labelKey: 'cards.steps.details' },
];

// Guided-flow progress: steps before `current` are done, `current` is highlighted.
function StepIndicator({ steps = BOOKING_STEPS, current }) {
  const { t } = useTranslation();
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <ol className="stepper" aria-label={t('cards.steps.ariaLabel')}>
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';

        return (
          <li
            key={step.key}
            className={`stepper__step stepper__step--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="stepper__dot" aria-hidden="true">
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span className="stepper__label">{step.labelKey ? t(step.labelKey) : step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default StepIndicator;
