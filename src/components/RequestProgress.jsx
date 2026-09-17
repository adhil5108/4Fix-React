const STEPS = [
  { status: 'PENDING', label: 'Request sent' },
  { status: 'QUOTE_RECEIVED', label: 'Quotes received' },
  { status: 'QUOTE_ACCEPTED', label: 'Quote accepted' },
  { status: 'SCHEDULED', label: 'Visit scheduled' },
  { status: 'IN_PROGRESS', label: 'Work in progress' },
  { status: 'COMPLETED', label: 'Completed' },
];

function RequestProgress({ status }) {
  if (status === 'CANCELLED') {
    return <p className="progress-cancelled">This request was cancelled.</p>;
  }

  const currentIndex = STEPS.findIndex((step) => step.status === status);

  return (
    <ol className="progress" aria-label="Request progress">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';

        return (
          <li
            key={step.status}
            className={`progress__step progress__step--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="progress__dot" aria-hidden="true" />
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default RequestProgress;
