import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TextField from './TextField.jsx';
import { Button, Notice } from './ui.jsx';

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };

// Returns a translation key (translated at render so a language switch updates it).
function geolocationError(error) {
  if (!window.isSecureContext) {
    return 'cards.location.errors.insecure';
  }

  switch (error?.code) {
    case 1:
      return 'cards.location.errors.denied';
    case 2:
      return 'cards.location.errors.unavailable';
    case 3:
      return 'cards.location.errors.timeout';
    default:
      return 'cards.location.errors.unknown';
  }
}

// Keyless OpenStreetMap embed: a visual confirmation only, not a navigation tool.
function mapPreviewUrl(latitude, longitude) {
  const delta = 0.004;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

export function LocationPreview({ latitude, longitude, title }) {
  const { t } = useTranslation();

  return (
    <iframe
      className="location-preview"
      title={title || t('cards.location.mapTitle')}
      src={mapPreviewUrl(latitude, longitude)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

// Captures the device's current position once, on request — a customer's service
// location, or (variant="shop") a provider's shop location at signup/profile. It never
// tracks. `value` is { latitude, longitude, address } or null; `address` is an optional
// typed hint.
function LocationCapture({ value, onChange, error, disabled = false, variant = 'service', id = 'location' }) {
  const { t } = useTranslation();
  // Wording differs per use; everything else (states, errors, buttons) is shared.
  const copy = (key, options) => t(`cards.${variant === 'shop' ? 'shopLocation' : 'location'}.${key}`, options);
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const [status, setStatus] = useState(value ? 'ready' : 'idle');
  const [message, setMessage] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const requested = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  function locate() {
    if (!supported) {
      setStatus('error');
      setMessage('cards.location.errors.unsupported');
      return;
    }

    setStatus('locating');
    setMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAccuracy(Math.round(position.coords.accuracy));
        setStatus('ready');
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: valueRef.current?.address || '',
        });
      },
      (geoError) => {
        setStatus('error');
        setMessage(geolocationError(geoError));
      },
      GEO_OPTIONS,
    );
  }

  // Ask once when the step opens; afterwards only on an explicit tap.
  useEffect(() => {
    if (!requested.current && !value) {
      requested.current = true;
      locate();
    }
  }, []);

  if (!supported) {
    return <Notice>{copy('unsupportedManual')}</Notice>;
  }

  return (
    <div className="form-stack" id={id} tabIndex={-1}>
      {status === 'locating' ? (
        <div className="location-status" role="status">
          <span className="location-status__pulse" aria-hidden="true" />
          {t('cards.location.locating')}
        </div>
      ) : null}

      {status === 'error' ? <Notice>{message ? t(message) : ''}</Notice> : null}
      {error && status !== 'error' ? <Notice>{error}</Notice> : null}

      {value && status !== 'locating' ? (
        <>
          <LocationPreview latitude={value.latitude} longitude={value.longitude} title={copy('mapTitle')} />
          <p className="field-hint">
            {accuracy ? copy('capturedAccuracy', { meters: accuracy }) : copy('captured')}
          </p>
          <TextField
            id={`${id}Address`}
            label={copy('landmark')}
            maxLength={240}
            value={value.address || ''}
            placeholder={copy('landmarkPlaceholder')}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, address: event.target.value })}
          />
        </>
      ) : null}

      {status !== 'locating' ? (
        <Button variant="secondary" onClick={locate} disabled={disabled}>
          {status === 'error'
            ? t('cards.location.tryAgain')
            : value
              ? t('cards.location.update')
              : t('cards.location.use')}
        </Button>
      ) : null}
    </div>
  );
}

export default LocationCapture;
