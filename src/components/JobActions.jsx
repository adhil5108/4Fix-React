import { useState } from 'react';
import { DateTimePicker, validateDateTime } from './AddressForm.jsx';
import { Button, Card } from './ui.jsx';
import { formatSlot, todayDateOnly } from '../utils/format.js';

export function ScheduleForm({ request, busy, onSubmit }) {
  const today = todayDateOnly();
  const [form, setForm] = useState({
    scheduledDate: request.preferredDate >= today ? request.preferredDate : '',
    scheduledTime: request.preferredTime || '',
  });
  const [errors, setErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateDateTime(form.scheduledDate, form.scheduledTime, {
      dateId: 'scheduledDate',
      timeId: 'scheduledTime',
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit(form);
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <DateTimePicker
        dateId="scheduledDate"
        timeId="scheduledTime"
        dateLabel="Visit date"
        timeLabel="Visit time"
        date={form.scheduledDate}
        time={form.scheduledTime}
        errors={errors}
        onChange={(field, value) => {
          setForm((current) => ({ ...current, [field]: value }));
          setErrors((current) => ({ ...current, [field]: '' }));
        }}
      />
      <Button type="submit" block loading={busy} loadingText="Scheduling…">
        Confirm visit
      </Button>
    </form>
  );
}

// Provider actions driven purely by the request lifecycle (schedule → start → complete).
// Booking-level tracking steps live on the job page.
export function LifecycleActions({ request, pending, onSchedule, onRequestConfirm }) {
  if (request.status === 'QUOTE_ACCEPTED') {
    return (
      <Card className="card--accent">
        <h2 className="card__title">You got the job</h2>
        <p className="body-text">
          Confirm when you’ll visit. The customer asked for{' '}
          {formatSlot(request.preferredDate, request.preferredTime)}.
        </p>
        <ScheduleForm request={request} busy={pending === 'schedule'} onSubmit={onSchedule} />
      </Card>
    );
  }

  if (request.status === 'SCHEDULED') {
    return (
      <Card className="card--accent">
        <h2 className="card__title">Visit scheduled</h2>
        <p className="body-text">
          {formatSlot(request.scheduledDate, request.scheduledTime)}. Start the service once you
          are with the customer.
        </p>
        <Button block onClick={() => onRequestConfirm('start')} disabled={Boolean(pending)}>
          Start service
        </Button>
      </Card>
    );
  }

  if (request.status === 'IN_PROGRESS') {
    return (
      <Card className="card--accent">
        <h2 className="card__title">Service in progress</h2>
        <p className="body-text">Mark the service complete once the work is done.</p>
        <Button block onClick={() => onRequestConfirm('complete')} disabled={Boolean(pending)}>
          Mark as complete
        </Button>
      </Card>
    );
  }

  return null;
}
