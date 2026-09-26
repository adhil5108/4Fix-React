import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/format.js';

// Default stages are labelled by status key (cards.timeline.stages.*). Custom `stages`
// from callers may carry a `labelKey` to translate, or a ready (already translated) `label`.
// A 4Fix job: accepted → in progress → completed. No travel/arrival steps.
const BOOKING_STAGES = [
  { status: 'ASSIGNED', labelKey: 'cards.timeline.stages.ASSIGNED', at: 'acceptedAt' },
  { status: 'IN_PROGRESS', labelKey: 'cards.timeline.stages.IN_PROGRESS', at: 'startedAt' },
  { status: 'COMPLETED', labelKey: 'cards.timeline.stages.COMPLETED', at: 'completedAt' },
];

const BOOKING_RANK = {
  ASSIGNED: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
};

// `stages`/`rank` default to a Booking's own lifecycle; an external job passes its own
// (SCHEDULED/ON_THE_WAY/ARRIVED/IN_PROGRESS/COMPLETED) instead of a separate component.
function TrackingTimeline({ status, timeline = {}, compact = false, stages = BOOKING_STAGES, rank = BOOKING_RANK }) {
  const { t } = useTranslation();

  if (status === 'CANCELLED') {
    return <p className="progress-cancelled">{t('cards.timeline.cancelled')}</p>;
  }

  const currentRank = rank[status] ?? 0;

  return (
    <ol className={`timeline${compact ? ' timeline--compact' : ''}`} aria-label={t('cards.timeline.ariaLabel')}>
      {stages.map((stage, index) => {
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
                {stage.labelKey ? t(stage.labelKey) : stage.label}
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
