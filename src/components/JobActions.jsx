import { useState } from 'react';
import { DateTimePicker, validateDateTime } from './AddressForm.jsx';
import { Button } from './ui.jsx';
import { todayDateOnly } from '../utils/format.js';

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
