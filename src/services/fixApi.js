import { apiRequest, toQueryString } from './api.js';

export const servicesApi = {
  list: (category) => apiRequest(`/api/services${toQueryString({ category })}`, { auth: false }),
  get: (serviceId) => apiRequest(`/api/services/${encodeURIComponent(serviceId)}`, { auth: false }),
};

export const requestsApi = {
  create: (payload) => apiRequest('/api/requests', { method: 'POST', body: payload }),
  list: (status) => apiRequest(`/api/requests${toQueryString({ status })}`),
  get: (requestId) => apiRequest(`/api/requests/${encodeURIComponent(requestId)}`),
  cancel: (requestId) =>
    apiRequest(`/api/requests/${encodeURIComponent(requestId)}/cancel`, { method: 'POST' }),
  quotes: (requestId) => apiRequest(`/api/requests/${encodeURIComponent(requestId)}/quotes`),
};

export const quotesApi = {
  accept: (quoteId) =>
    apiRequest(`/api/quotes/${encodeURIComponent(quoteId)}/accept`, { method: 'POST' }),
  reject: (quoteId) =>
    apiRequest(`/api/quotes/${encodeURIComponent(quoteId)}/reject`, { method: 'POST' }),
};

export const providerApi = {
  listRequests: (status) => apiRequest(`/api/provider/requests${toQueryString({ status })}`),
  getRequest: (requestId) =>
    apiRequest(`/api/provider/requests/${encodeURIComponent(requestId)}`),
  submitQuote: (requestId, { amount, description }) =>
    apiRequest(`/api/requests/${encodeURIComponent(requestId)}/quotes`, {
      method: 'POST',
      body: { amount, description },
    }),
  schedule: (requestId, { scheduledDate, scheduledTime }) =>
    apiRequest(`/api/requests/${encodeURIComponent(requestId)}/schedule`, {
      method: 'POST',
      body: { scheduledDate, scheduledTime },
    }),
  start: (requestId) =>
    apiRequest(`/api/requests/${encodeURIComponent(requestId)}/start`, { method: 'POST' }),
  complete: (requestId) =>
    apiRequest(`/api/requests/${encodeURIComponent(requestId)}/complete`, { method: 'POST' }),
};
