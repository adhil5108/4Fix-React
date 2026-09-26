import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import TextField from './TextField.jsx';
import { todayDateOnly } from '../utils/format.js';

export function AddressForm({ form, errors, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="form-stack">
      <TextField
        id="addressLine"
        label={t('cards.address.address')}
        autoComplete="street-address"
        maxLength={240}
        value={form.addressLine}
        error={errors.addressLine}
        placeholder={t('cards.address.addressPlaceholder')}
        onChange={(event) => onChange('addressLine', event.target.value)}
      />
      <div className="form-row">
        <TextField
          id="city"
          label={t('cards.address.city')}
          autoComplete="address-level2"
          maxLength={80}
          value={form.city}
          error={errors.city}
          placeholder={t('cards.address.cityPlaceholder')}
          onChange={(event) => onChange('city', event.target.value)}
        />
        <TextField
          id="state"
          label={t('cards.address.state')}
          autoComplete="address-level1"
          maxLength={80}
          value={form.state}
          error={errors.state}
          placeholder={t('cards.address.statePlaceholder')}
          onChange={(event) => onChange('state', event.target.value)}
        />
      </div>
      <TextField
        id="pincode"
        label={t('cards.address.pincode')}
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={form.pincode}
        error={errors.pincode}
        placeholder={t('cards.address.pincodePlaceholder')}
        onChange={(event) => onChange('pincode', event.target.value.replace(/\D/g, ''))}
      />
    </div>
  );
}

export function DateTimePicker({
  dateId = 'preferredDate',
  timeId = 'preferredTime',
  dateLabel,
  timeLabel,
  date,
  time,
  errors = {},
  onChange,
}) {
  const { t } = useTranslation();

  return (
    <div className="form-row">
      <TextField
        id={dateId}
        label={dateLabel ?? t('cards.address.date')}
        type="date"
        min={todayDateOnly()}
        value={date}
        error={errors[dateId]}
        onChange={(event) => onChange(dateId, event.target.value)}
      />
      <TextField
        id={timeId}
        label={timeLabel ?? t('cards.address.time')}
        type="time"
        value={time}
        error={errors[timeId]}
        onChange={(event) => onChange(timeId, event.target.value)}
      />
    </div>
  );
}

// `t` is optional so existing callers keep working; it defaults to the global i18n instance.
export function validateAddress(form, t = i18n.t.bind(i18n)) {
  const errors = {};
  const check = (field, min, max) => {
    const length = form[field].trim().length;
    if (length === 0) errors[field] = t(`cards.address.errors.${field}Required`);
    else if (length < min) errors[field] = t(`cards.address.errors.${field}Min`, { min });
    else if (length > max) errors[field] = t(`cards.address.errors.${field}Max`, { max });
  };

  check('addressLine', 5, 240);
  check('city', 2, 80);
  check('state', 2, 80);

  if (!/^\d{6}$/.test(form.pincode.trim())) {
    errors.pincode = t('cards.address.errors.pincode');
  }

  return errors;
}

export function validateDateTime(
  date,
  time,
  { dateId = 'preferredDate', timeId = 'preferredTime' } = {},
  t = i18n.t.bind(i18n),
) {
  const errors = {};

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors[dateId] = t('cards.address.errors.dateRequired');
  } else if (date < todayDateOnly()) {
    errors[dateId] = t('cards.address.errors.datePast');
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    errors[timeId] = t('cards.address.errors.timeRequired');
  }

  return errors;
}
