import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LocationCapture from './LocationCapture.jsx';
import TextField from './TextField.jsx';
import { Notice } from './ui.jsx';

// Accepts "12.97, 77.59" or a Google Maps link containing coordinates (@lat,lng /
// q= / query= / destination= / ll=). Returns { latitude, longitude } or null.
export function parseCoordinates(text) {
  const value = String(text || '').trim();
  const match =
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(value) ||
    /[?&](?:q|query|destination|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i.exec(value) ||
    /^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/.exec(value);

  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return { latitude, longitude };
}

// A provider's fixed shop/business location: captured once from this device's
// location, or entered as coordinates / a Maps link when geolocation isn't available.
// It is profile data — never a live position.
//
// `manualOnly` (provider registration): the typed shop name/address only — no
// coordinates, no map, and the location component is never mounted, so the browser is
// never asked for location permission. `value` is then { address } or null.
function ShopLocationField({ value, onChange, error, disabled = false, manualOnly = false }) {
  const { t } = useTranslation();
  const geolocationSupported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const [manual, setManual] = useState(manualOnly || !geolocationSupported);
  const [coordinatesText, setCoordinatesText] = useState(
    value ? `${value.latitude}, ${value.longitude}` : '',
  );
  // Kept locally so a name/address typed before the coordinates isn't lost.
  const [addressText, setAddressText] = useState(value?.address || '');
  const [parseError, setParseError] = useState('');

  function updateManual(text) {
    setCoordinatesText(text);
    const parsed = parseCoordinates(text);
    setParseError(text.trim() && !parsed ? 'cards.shopLocation.manualInvalid' : '');
    onChange(parsed ? { ...parsed, address: value?.address || '' } : null);
  }

  const coordinatesField = (
    <TextField
      id="shopLocation"
      label={t('cards.shopLocation.manualLabel')}
      value={coordinatesText}
      placeholder={t('cards.shopLocation.manualPlaceholder')}
      error={parseError ? t(parseError) : error}
      disabled={disabled}
      onChange={(event) => updateManual(event.target.value)}
    />
  );

  if (manualOnly) {
    return (
      <TextField
        id="shopLocationAddress"
        label={t('cards.shopLocation.addressLabel')}
        autoComplete="street-address"
        maxLength={240}
        value={addressText}
        placeholder={t('cards.shopLocation.landmarkPlaceholder')}
        error={error}
        disabled={disabled}
        onChange={(event) => {
          setAddressText(event.target.value);
          onChange(event.target.value.trim() ? { address: event.target.value } : null);
        }}
      />
    );
  }

  return (
    <div className="form-stack">
      {manual ? (
        <>
          <Notice tone="info">{t('cards.shopLocation.manualHelp')}</Notice>
          {coordinatesField}
          <TextField
            id="shopLocationAddress"
            label={t('cards.shopLocation.landmark')}
            maxLength={240}
            value={value?.address || ''}
            placeholder={t('cards.shopLocation.landmarkPlaceholder')}
            disabled={disabled || !value}
            onChange={(event) => value && onChange({ ...value, address: event.target.value })}
          />
          {geolocationSupported ? (
            <button type="button" className="link location-switch" onClick={() => setManual(false)}>
              {t('cards.shopLocation.useDevice')}
            </button>
          ) : null}
        </>
      ) : (
        <>
          <LocationCapture
            id="shopLocation"
            variant="shop"
            value={value}
            error={error}
            disabled={disabled}
            onChange={onChange}
          />
          <button type="button" className="link location-switch" onClick={() => setManual(true)}>
            {t('cards.shopLocation.enterManually')}
          </button>
        </>
      )}
    </div>
  );
}

export default ShopLocationField;
