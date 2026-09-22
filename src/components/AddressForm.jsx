import TextField from './TextField.jsx';
import { todayDateOnly } from '../utils/format.js';

export function AddressForm({ form, errors, onChange }) {
  return (
    <div className="form-stack">
      <TextField
        id="addressLine"
        label="Address"
        autoComplete="street-address"
        maxLength={240}
        value={form.addressLine}
        error={errors.addressLine}
        placeholder="House / flat, street, area"
        onChange={(event) => onChange('addressLine', event.target.value)}
      />
      <div className="form-row">
        <TextField
          id="city"
          label="City"
          autoComplete="address-level2"
          maxLength={80}
          value={form.city}
          error={errors.city}
          placeholder="City"
          onChange={(event) => onChange('city', event.target.value)}
        />
        <TextField
          id="state"
          label="State"
          autoComplete="address-level1"
          maxLength={80}
          value={form.state}
          error={errors.state}
          placeholder="State"
          onChange={(event) => onChange('state', event.target.value)}
        />
      </div>
      <TextField
        id="pincode"
        label="Pincode"
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={form.pincode}
        error={errors.pincode}
        placeholder="6-digit pincode"
        onChange={(event) => onChange('pincode', event.target.value.replace(/\D/g, ''))}
      />
    </div>
  );
}

export function DateTimePicker({
  dateId = 'preferredDate',
  timeId = 'preferredTime',
  dateLabel = 'Date',
  timeLabel = 'Time',
  date,
  time,
  errors = {},
  onChange,
}) {
  return (
    <div className="form-row">
      <TextField
        id={dateId}
        label={dateLabel}
        type="date"
        min={todayDateOnly()}
        value={date}
        error={errors[dateId]}
        onChange={(event) => onChange(dateId, event.target.value)}
      />
      <TextField
        id={timeId}
        label={timeLabel}
        type="time"
        value={time}
        error={errors[timeId]}
        onChange={(event) => onChange(timeId, event.target.value)}
      />
    </div>
  );
}

export function validateAddress(form) {
  const errors = {};
  const check = (field, label, min, max) => {
    const length = form[field].trim().length;
    if (length === 0) errors[field] = `Enter ${label.toLowerCase()}.`;
    else if (length < min) errors[field] = `${label} must be at least ${min} characters.`;
    else if (length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
  };

  check('addressLine', 'Address', 5, 240);
  check('city', 'City', 2, 80);
  check('state', 'State', 2, 80);

  if (!/^\d{6}$/.test(form.pincode.trim())) {
    errors.pincode = 'Enter a valid 6-digit pincode.';
  }

  return errors;
}

export function validateDateTime(date, time, { dateId = 'preferredDate', timeId = 'preferredTime' } = {}) {
  const errors = {};

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors[dateId] = 'Choose a date.';
  } else if (date < todayDateOnly()) {
    errors[dateId] = 'Date cannot be in the past.';
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    errors[timeId] = 'Choose a time.';
  }

  return errors;
}
