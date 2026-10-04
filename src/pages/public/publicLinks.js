// Entry into the customer booking flow for a service, optionally with a chosen issue.
export function bookPath(serviceId, issueKey) {
  const base = `/book/${encodeURIComponent(serviceId)}`;
  return issueKey ? `${base}?issue=${encodeURIComponent(issueKey)}` : base;
}

// A category's page: the services customers can book inside it.
export function categoryPath(categoryId) {
  return `/categories/${encodeURIComponent(categoryId)}`;
}

export function servicePath(serviceId) {
  return `/services/${encodeURIComponent(serviceId)}`;
}
