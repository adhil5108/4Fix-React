const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;

function getFriendlyError(status, payload) {
  const code = payload?.error?.code;

  if (code === 'INVALID_CREDENTIALS') {
    return 'Incorrect username or password.';
  }

  if (code === 'ACCOUNT_EXISTS' || code === 'DUPLICATE_RESOURCE') {
    return 'An account already exists with this phone number.';
  }

  if (code === 'VALIDATION_ERROR') {
    return payload?.error?.message || 'Please check the form and try again.';
  }

  if (status >= 500) {
    return 'Something went wrong. Please try again.';
  }

  return payload?.error?.message || 'Something went wrong. Please try again.';
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (_error) {
    throw new Error('Something went wrong. Please try again.');
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getFriendlyError(response.status, payload));
  }

  return payload;
}

export function signupCustomerRequest(payload) {
  return request('/api/auth/customer/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function signupProviderRequest(payload) {
  return request('/api/auth/provider/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginRequest(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
