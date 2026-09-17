import { apiRequest } from './api.js';

export function signupCustomerRequest(payload) {
  return apiRequest('/api/auth/customer/signup', { method: 'POST', body: payload, auth: false });
}

export function signupProviderRequest(payload) {
  return apiRequest('/api/auth/provider/signup', { method: 'POST', body: payload, auth: false });
}

export function loginRequest(payload) {
  return apiRequest('/api/auth/login', { method: 'POST', body: payload, auth: false });
}

export function meRequest() {
  return apiRequest('/api/auth/me');
}

export function updateMeRequest(payload) {
  return apiRequest('/api/users/me', { method: 'PATCH', body: payload });
}
