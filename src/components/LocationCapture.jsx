import { useEffect, useRef, useState } from 'react';
import TextField from './TextField.jsx';
import { Button, Notice } from './ui.jsx';

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 };

function geolocationError(error) {
  if (!window.isSecureContext) {
    return 'Location needs a secure (https) connection. Open 4Fix over https and try again.';
  }

  switch (error?.code) {
    case 1:
      return 'Location permission was denied. Allow location for this site in your browser settings, then try again.';
    case 2:
      return 'Your location is unavailable right now. Check that location services are on, then try again.';
    case 3:
      return 'Finding your location took too long. Move somewhere with a clearer signal and try again.';
    default:
      return 'We couldn’t read your location. Please try again.';
  }
}

// Keyless OpenStreetMap embed: a visual confirmation only, not a navigation tool.
function mapPreviewUrl(latitude, longitude) {
  const delta = 0.004;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

export function LocationPreview({ latitude, longitude }) {
  return (
    <iframe
      className="location-preview"
      title="Service location on a map"
      src={mapPreviewUrl(latitude, longitude)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

// Captures the device's current position for a service request. `value` is
// { latitude, longitude, address } or null; `address` is an optional typed hint.
function LocationCapture({ value, onChange, error, disabled = false }) {
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
      setMessage('This browser can’t share your location.');
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
    return <Notice>This browser can’t share your location. Enter your address manually instead.</Notice>;
  }

  return (
    <div className="form-stack" id="location" tabIndex={-1}>
      {status === 'locating' ? (
        <div className="location-status" role="status">
          <span className="location-status__pulse" aria-hidden="true" />
          Finding your location… Allow location access if your browser asks.
        </div>
      ) : null}

      {status === 'error' ? <Notice>{message}</Notice> : null}
      {error && status !== 'error' ? <Notice>{error}</Notice> : null}

      {value && status !== 'locating' ? (
        <>
          <LocationPreview latitude={value.latitude} longitude={value.longitude} />
          <p className="field-hint">
            📍 Location captured{accuracy ? ` (accurate to about ${accuracy} m)` : ''}. Your
            provider will navigate straight here. Not right? Move to the service spot and update it.
          </p>
          <TextField
            id="locationAddress"
            label="Flat, floor or landmark (optional)"
            maxLength={240}
            value={value.address || ''}
            placeholder="e.g. Flat 3B, 2nd floor, opposite the temple"
            disabled={disabled}
            onChange={(event) => onChange({ ...value, address: event.target.value })}
          />
        </>
      ) : null}

      {status !== 'locating' ? (
        <Button variant="secondary" onClick={locate} disabled={disabled}>
          {status === 'error' ? 'Try again' : value ? 'Update to my current location' : 'Use my current location'}
        </Button>
      ) : null}
    </div>
  );
}

export default LocationCapture;
