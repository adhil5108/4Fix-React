import { useTranslation } from 'react-i18next';
import TextField from './TextField.jsx';

// A provider's shop/business name and address, typed separately (signup and profile).
// The address is the shop location: no map, no coordinates, and the browser is never
// asked for location permission. `value` is { shopName, address }; `errors` holds
// already-translated messages; onChange(field, text) reports one field at a time.
function ShopDetailsFields({ value, errors = {}, disabled = false, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="form-stack">
      <TextField
        id="shopName"
        label={t('auth.shop.nameLabel')}
        autoComplete="organization"
        maxLength={120}
        value={value.shopName}
        placeholder={t('auth.shop.namePlaceholder')}
        error={errors.shopName}
        disabled={disabled}
        onChange={(event) => onChange('shopName', event.target.value)}
      />
      <TextField
        id="shopAddress"
        label={t('auth.shop.addressLabel')}
        autoComplete="street-address"
        maxLength={240}
        value={value.address}
        placeholder={t('auth.shop.addressPlaceholder')}
        error={errors.shopAddress}
        disabled={disabled}
        onChange={(event) => onChange('address', event.target.value)}
      />
    </div>
  );
}

// Returns translation keys (translated where rendered) so errors follow a language
// switch. The name is required at signup; on the profile, providers registered before
// it existed may leave it empty.
export function validateShopDetails({ shopName, address }, { requireName = true } = {}) {
  const errors = {};
  const name = shopName.trim();
  const shopAddress = address.trim();

  if (!name && requireName) {
    errors.shopName = 'auth.errors.shopNameRequired';
  } else if (name && name.length < 2) {
    errors.shopName = 'auth.errors.shopNameShort';
  }

  if (!shopAddress) {
    errors.shopAddress = 'auth.errors.shopAddressRequired';
  } else if (shopAddress.length < 5) {
    errors.shopAddress = 'auth.errors.shopAddressShort';
  }

  return errors;
}

export default ShopDetailsFields;
