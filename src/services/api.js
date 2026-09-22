import { readStoredAuth } from './authStorage.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN_ERROR' } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function friendlyMessage(status, payload) {
  const code = payload?.error?.code;
  const message = payload?.error?.message;

  if (code === 'INVALID_CREDENTIALS') {
    return 'Incorrect phone number or password.';
  }

  if (code === 'ACCOUNT_EXISTS' || code === 'DUPLICATE_RESOURCE') {
    return 'An account already exists with this phone number.';
  }

  if (status === 401) {
    return 'Your session has ended. Please log in again.';
  }

  if (status === 403) {
    return 'You do not have access to this.';
  }

  if (status >= 500) {
    return GENERIC_MESSAGE;
  }

  // 400/404/409 messages from the backend are written for end users.
  return message || GENERIC_MESSAGE;
}

// Shared by apiRequest (JSON) and uploadFile (multipart): same auth token, same
// network/401/error handling either way.
async function sendRequest(path, { method, headers, body, auth }) {
  const token = auth ? readStoredAuth()?.accessToken : null;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  } catch {
    throw new ApiRequestError('Unable to reach 4Fix. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
    });
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Only a rejected token ends the session; a failed login is just a form error.
    if (response.status === 401 && token && unauthorizedHandler) {
      unauthorizedHandler();
    }

    throw new ApiRequestError(friendlyMessage(response.status, payload), {
      status: response.status,
      code: payload?.error?.code,
    });
  }

  return payload;
}

export function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  return sendRequest(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    auth,
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
