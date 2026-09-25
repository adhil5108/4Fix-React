import { apiRequest, toQueryString, uploadFile } from './api.js';

const id = (value) => encodeURIComponent(value);

export const uploadsApi = {
  image: (file) => uploadFile('/api/uploads/image', file, 'image'),
  audio: (file) => uploadFile('/api/uploads/audio', file, 'audio'),
};

export const servicesApi = {
  list: ({ search, category, popular } = {}) =>
    apiRequest(`/api/services${toQueryString({ search, category, popular })}`, { auth: false }),
  get: (serviceId) => apiRequest(`/api/services/${id(serviceId)}`, { auth: false }),
};

export const providersApi = {
  get: (providerId) => apiRequest(`/api/providers/${id(providerId)}`, { auth: false }),
  reviews: (providerId) => apiRequest(`/api/providers/${id(providerId)}/reviews`, { auth: false }),
};

export const requestsApi = {
  create: (payload) => apiRequest('/api/requests', { method: 'POST', body: payload }),
  list: (status) => apiRequest(`/api/requests${toQueryString({ status })}`),
  get: (requestId) => apiRequest(`/api/requests/${id(requestId)}`),
  cancel: (requestId) => apiRequest(`/api/requests/${id(requestId)}/cancel`, { method: 'POST' }),
};

export const bookingsApi = {
  list: ({ status } = {}) => apiRequest(`/api/bookings${toQueryString({ status })}`),
  get: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}`),
  tracking: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/tracking`),

  onTheWay: (bookingId) =>
    apiRequest(`/api/bookings/${id(bookingId)}/on-the-way`, { method: 'POST' }),
  arrived: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/arrived`, { method: 'POST' }),
  updateLocation: (bookingId, { latitude, longitude }) =>
    apiRequest(`/api/bookings/${id(bookingId)}/location`, {
      method: 'PATCH',
      body: { latitude, longitude },
    }),

  openChat: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/chat`, { method: 'POST' }),
  // Read-only GET, never creates a conversation — used by admin's platform-wide,
  // read-only chat view (a customer/provider could use it too, but they already have
  // openChat, which also creates the conversation on first use).
  getConversation: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/chat`),
  messages: (bookingId, since) =>
    apiRequest(`/api/bookings/${id(bookingId)}/messages${toQueryString({ since })}`),
  sendMessage: (bookingId, message) =>
    apiRequest(`/api/bookings/${id(bookingId)}/messages`, { method: 'POST', body: { message } }),
  markRead: (bookingId) =>
    apiRequest(`/api/bookings/${id(bookingId)}/messages/read`, { method: 'POST' }),

  review: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/review`),
  createReview: (bookingId, { rating, comment }) =>
    apiRequest(`/api/bookings/${id(bookingId)}/review`, {
      method: 'POST',
      body: { rating, comment: comment || undefined },
    }),

  // Private to the provider — never returned in the customer/admin booking payload.
  notes: {
    list: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/notes`),
    create: (bookingId, content) =>
      apiRequest(`/api/bookings/${id(bookingId)}/notes`, { method: 'POST', body: { content } }),
    update: (bookingId, noteId, content) =>
      apiRequest(`/api/bookings/${id(bookingId)}/notes/${id(noteId)}`, {
        method: 'PATCH',
        body: { content },
      }),
    remove: (bookingId, noteId) =>
      apiRequest(`/api/bookings/${id(bookingId)}/notes/${id(noteId)}`, { method: 'DELETE' }),
  },
};

export const adminApi = {
  dashboard: () => apiRequest('/api/admin/dashboard'),

  services: (params = {}) => apiRequest(`/api/admin/services${toQueryString(params)}`),
  service: (serviceId) => apiRequest(`/api/admin/services/${id(serviceId)}`),
  createService: (payload) => apiRequest('/api/admin/services', { method: 'POST', body: payload }),
  updateService: (serviceId, payload) =>
    apiRequest(`/api/admin/services/${id(serviceId)}`, { method: 'PATCH', body: payload }),
  deleteService: (serviceId) =>
    apiRequest(`/api/admin/services/${id(serviceId)}`, { method: 'DELETE' }),

  providers: (params = {}) => apiRequest(`/api/admin/providers${toQueryString(params)}`),
  provider: (providerId) => apiRequest(`/api/admin/providers/${id(providerId)}`),
  setProviderStatus: (providerId, isActive) =>
    apiRequest(`/api/admin/providers/${id(providerId)}/status`, {
      method: 'PATCH',
      body: { isActive },
    }),

  customers: (params = {}) => apiRequest(`/api/admin/customers${toQueryString(params)}`),
  customer: (customerId) => apiRequest(`/api/admin/customers/${id(customerId)}`),

  requests: (params = {}) => apiRequest(`/api/admin/requests${toQueryString(params)}`),
  request: (requestId) => apiRequest(`/api/admin/requests/${id(requestId)}`),

  bookings: (params = {}) => apiRequest(`/api/admin/bookings${toQueryString(params)}`),
  booking: (bookingId) => apiRequest(`/api/admin/bookings/${id(bookingId)}`),

  reviews: (params = {}) => apiRequest(`/api/admin/reviews${toQueryString(params)}`),
  review: (reviewId) => apiRequest(`/api/admin/reviews/${id(reviewId)}`),
};

export const providerApi = {
  listRequests: (status) => apiRequest(`/api/provider/requests${toQueryString({ status })}`),
  getRequest: (requestId) => apiRequest(`/api/provider/requests/${id(requestId)}`),
  jobs: ({ status, bookingStatus } = {}) =>
    apiRequest(`/api/provider/jobs${toQueryString({ status, bookingStatus })}`),
  // Atomically claims an open request; 409 when another provider got there first.
  accept: (requestId) => apiRequest(`/api/requests/${id(requestId)}/accept`, { method: 'POST' }),
  schedule: (requestId, { scheduledDate, scheduledTime }) =>
    apiRequest(`/api/requests/${id(requestId)}/schedule`, {
      method: 'POST',
      body: { scheduledDate, scheduledTime },
    }),
  start: (requestId) => apiRequest(`/api/requests/${id(requestId)}/start`, { method: 'POST' }),
  complete: (requestId) =>
    apiRequest(`/api/requests/${id(requestId)}/complete`, { method: 'POST' }),
};

// Jobs a provider records themselves — work that came in outside 4Fix. Provider-only;
// never visible to customers or other providers.
export const providerExternalJobsApi = {
  create: (payload) => apiRequest('/api/provider/external-jobs', { method: 'POST', body: payload }),
  get: (jobId) => apiRequest(`/api/provider/external-jobs/${id(jobId)}`),
  update: (jobId, payload) =>
    apiRequest(`/api/provider/external-jobs/${id(jobId)}`, { method: 'PATCH', body: payload }),
  remove: (jobId) => apiRequest(`/api/provider/external-jobs/${id(jobId)}`, { method: 'DELETE' }),

  onTheWay: (jobId) => apiRequest(`/api/provider/external-jobs/${id(jobId)}/on-the-way`, { method: 'POST' }),
  arrived: (jobId) => apiRequest(`/api/provider/external-jobs/${id(jobId)}/arrived`, { method: 'POST' }),
  start: (jobId) => apiRequest(`/api/provider/external-jobs/${id(jobId)}/start`, { method: 'POST' }),
  complete: (jobId) => apiRequest(`/api/provider/external-jobs/${id(jobId)}/complete`, { method: 'POST' }),

  notes: {
    list: (jobId) => apiRequest(`/api/provider/external-jobs/${id(jobId)}/notes`),
    create: (jobId, content) =>
      apiRequest(`/api/provider/external-jobs/${id(jobId)}/notes`, { method: 'POST', body: { content } }),
    update: (jobId, noteId, content) =>
      apiRequest(`/api/provider/external-jobs/${id(jobId)}/notes/${id(noteId)}`, {
        method: 'PATCH',
        body: { content },
      }),
    remove: (jobId, noteId) =>
      apiRequest(`/api/provider/external-jobs/${id(jobId)}/notes/${id(noteId)}`, { method: 'DELETE' }),
  },
};
