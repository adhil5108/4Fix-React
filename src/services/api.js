import i18n from '../i18n/index.js';
import { readStoredAuth } from './authStorage.js';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Errors keep the raw status/code/server message and translate on read, so the text
// shown always follows the current UI language (even after switching).
export class ApiRequestError extends Error {
  constructor(serverMessage, { status = 0, code = 'UNKNOWN_ERROR' } = {}) {
    super();
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage || '';
  }

  get message() {
    return translateApiError(this);
  }
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function translateApiError({ status, code, serverMessage }) {
  const t = i18n.t.bind(i18n);

  if (code === 'NETWORK_ERROR') return t('common.errors.network');
  if (code === 'INVALID_CREDENTIALS') return t('common.errors.invalidCredentials');
  if (code === 'ACCOUNT_EXISTS' || code === 'DUPLICATE_RESOURCE') return t('common.errors.accountExists');
  if (status === 401) return t('common.errors.sessionEnded');
  if (status === 403) return t('common.errors.noAccess');
  if (status >= 500 && code !== 'UPLOAD_FAILED') return t('common.errors.generic');

  if (code && i18n.exists(`common.errors.codes.${code}`)) {
    return t(`common.errors.codes.${code}`);
  }

  if (code === 'VALIDATION_ERROR') {
    const known = t('common.errors.validation', { returnObjects: true })[serverMessage];
    if (known) return known;
  }

  // Unmapped 400/404/409 messages are written for end users in English; in another
  // language fall back to a translated message for that status instead.
  if (serverMessage && i18n.language === 'en') return serverMessage;

  return i18n.exists(`common.errors.byStatus.${status}`)
    ? t(`common.errors.byStatus.${status}`)
    : t('common.errors.generic');
}

// Shared by apiRequest (JSON) and uploadFile (multipart): same auth token, same
// network/401/error handling either way. `auth` sends the provider/admin JWT;
// `requestToken` sends an anonymous customer's request access token instead.
async function sendRequest(path, { method, headers, body, auth, requestToken }) {
  const token = auth ? readStoredAuth()?.accessToken : null;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestToken ? { 'X-Request-Token': requestToken } : {}),
      },
      body,
    });
  } catch {
    throw new ApiRequestError('', { code: 'NETWORK_ERROR' });
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Only a rejected provider/admin JWT ends the session; a failed login is just a form
    // error, and a customer's request token has no session to end.
    if (response.status === 401 && token && unauthorizedHandler) {
      unauthorizedHandler();
    }

    throw new ApiRequestError(payload?.error?.message, {
      status: response.status,
      code: payload?.error?.code,
    });
  }

  return payload;
}

export function apiRequest(path, { method = 'GET', body, auth = true, requestToken } = {}) {
  return sendRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    auth,
    requestToken,
  });
}

// multipart/form-data upload for a single file. No Content-Type header is set so the
// browser fills in the correct multipart boundary itself.
export function uploadFile(path, file, fieldName) {
  const formData = new FormData();
  formData.append(fieldName, file);

  return sendRequest(path, { method: 'POST', headers: {}, body: formData, auth: true });
}

export function toQueryString(params) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const text = search.toString();
  return text ? `?${text}` : '';
}
