import { apiRequest, toQueryString, uploadFile } from './api.js';

const id = (value) => encodeURIComponent(value);

export const uploadsApi = {
  image: (file) => uploadFile('/api/uploads/image', file, 'image'),
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
  quotes: (requestId) => apiRequest(`/api/requests/${id(requestId)}/quotes`),
  providers: (requestId) => apiRequest(`/api/requests/${id(requestId)}/providers`),
  confirm: (requestId) => apiRequest(`/api/requests/${id(requestId)}/confirm`, { method: 'POST' }),
};

export const quotesApi = {
  accept: (quoteId) => apiRequest(`/api/quotes/${id(quoteId)}/accept`, { method: 'POST' }),
  reject: (quoteId) => apiRequest(`/api/quotes/${id(quoteId)}/reject`, { method: 'POST' }),
};

export const bookingsApi = {
  list: ({ status } = {}) => apiRequest(`/api/bookings${toQueryString({ status })}`),
  get: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}`),
  tracking: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/tracking`),

  assign: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/assign`, { method: 'POST' }),
  onTheWay: (bookingId) =>
    apiRequest(`/api/bookings/${id(bookingId)}/on-the-way`, { method: 'POST' }),
  arrived: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/arrived`, { method: 'POST' }),
  updateLocation: (bookingId, { latitude, longitude }) =>
    apiRequest(`/api/bookings/${id(bookingId)}/location`, {
      method: 'PATCH',
      body: { latitude, longitude },
    }),

  openChat: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/chat`, { method: 'POST' }),
  messages: (bookingId, since) =>
    apiRequest(`/api/bookings/${id(bookingId)}/messages${toQueryString({ since })}`),
  sendMessage: (bookingId, message) =>
    apiRequest(`/api/bookings/${id(bookingId)}/messages`, { method: 'POST', body: { message } }),
  markRead: (bookingId) =>
    apiRequest(`/api/bookings/${id(bookingId)}/messages/read`, { method: 'POST' }),

  payment: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/payment`),
  markPaid: (bookingId, { method, transactionReference }) =>
    apiRequest(`/api/bookings/${id(bookingId)}/payment/mark-paid`, {
      method: 'POST',
      body: { method, transactionReference: transactionReference || undefined },
    }),

  review: (bookingId) => apiRequest(`/api/bookings/${id(bookingId)}/review`),
  createReview: (bookingId, { rating, comment }) =>
    apiRequest(`/api/bookings/${id(bookingId)}/review`, {
      method: 'POST',
      body: { rating, comment: comment || undefined },
    }),
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

  quotes: (params = {}) => apiRequest(`/api/admin/quotes${toQueryString(params)}`),
  quote: (quoteId) => apiRequest(`/api/admin/quotes/${id(quoteId)}`),
  assignQuote: (quoteId) =>
    apiRequest(`/api/admin/quotes/${id(quoteId)}/assign`, { method: 'POST' }),

  bookings: (params = {}) => apiRequest(`/api/admin/bookings${toQueryString(params)}`),
  booking: (bookingId) => apiRequest(`/api/admin/bookings/${id(bookingId)}`),

  payments: (params = {}) => apiRequest(`/api/admin/payments${toQueryString(params)}`),
  payment: (paymentId) => apiRequest(`/api/admin/payments/${id(paymentId)}`),

  reviews: (params = {}) => apiRequest(`/api/admin/reviews${toQueryString(params)}`),
  review: (reviewId) => apiRequest(`/api/admin/reviews/${id(reviewId)}`),
};

export const providerApi = {
  listRequests: (status) => apiRequest(`/api/provider/requests${toQueryString({ status })}`),
  getRequest: (requestId) => apiRequest(`/api/provider/requests/${id(requestId)}`),
  jobs: ({ status, bookingStatus } = {}) =>
    apiRequest(`/api/provider/jobs${toQueryString({ status, bookingStatus })}`),
  submitQuote: (requestId, { amount, description }) =>
    apiRequest(`/api/requests/${id(requestId)}/quotes`, {
      method: 'POST',
      body: { amount, description },
    }),
  schedule: (requestId, { scheduledDate, scheduledTime }) =>
    apiRequest(`/api/requests/${id(requestId)}/schedule`, {
      method: 'POST',
      body: { scheduledDate, scheduledTime },
    }),
  start: (requestId) => apiRequest(`/api/requests/${id(requestId)}/start`, { method: 'POST' }),
  complete: (requestId) =>
    apiRequest(`/api/requests/${id(requestId)}/complete`, { method: 'POST' }),
};
