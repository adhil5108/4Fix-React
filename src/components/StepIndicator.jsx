export const BOOKING_STEPS = [
  { key: 'service', label: 'Service' },
  { key: 'issue', label: 'Issue' },
  { key: 'details', label: 'Details & location' },
];

// Guided-flow progress: steps before `current` are done, `current` is highlighted.
function StepIndicator({ steps = BOOKING_STEPS, current }) {
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <ol className="stepper" aria-label="Booking steps">
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
            <span className="stepper__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default StepIndicator;
