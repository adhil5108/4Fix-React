import { formatDateTime } from '../utils/format.js';

const STAGES = [
  { status: 'CONFIRMED', label: 'Booking confirmed', at: 'confirmedAt' },
  { status: 'ON_THE_WAY', label: 'Technician on the way', at: 'onTheWayAt' },
  { status: 'ARRIVED', label: 'Technician arrived', at: 'arrivedAt' },
  { status: 'IN_SERVICE', label: 'Service in progress', at: 'technicianStartedAt' },
  { status: 'COMPLETED', label: 'Completed', at: 'completedAt' },
];

// ASSIGNED sits between confirmed and on-the-way; it shares the "confirmed" stage.
const RANK = {
  CONFIRMED: 0,
  ASSIGNED: 0,
  ON_THE_WAY: 1,
  ARRIVED: 2,
  IN_SERVICE: 3,
  COMPLETED: 4,
};

function TrackingTimeline({ status, timeline = {}, compact = false }) {
  if (status === 'CANCELLED') {
    return <p className="progress-cancelled">This booking was cancelled.</p>;
  }

  const currentRank = RANK[status] ?? 0;

  return (
    <ol className={`timeline${compact ? ' timeline--compact' : ''}`} aria-label="Booking progress">
      {STAGES.map((stage, index) => {
        const state = index < currentRank ? 'done' : index === currentRank ? 'current' : 'upcoming';
        const reachedAt = timeline[stage.at];

        return (
          <li
            key={stage.status}
            className={`timeline__step timeline__step--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="timeline__dot" aria-hidden="true" />
            <span className="timeline__body">
              <span className="timeline__label">
                {stage.label}
                {status === 'ASSIGNED' && stage.status === 'CONFIRMED' ? ' · technician assigned' : ''}
              </span>
              {!compact && reachedAt && state !== 'upcoming' ? (
                <span className="timeline__time">{formatDateTime(reachedAt)}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default TrackingTimeline;
