// Entry into the customer booking flow for a service, optionally with a chosen issue.
export function bookPath(serviceId, issueKey) {
  const base = `/book/${encodeURIComponent(serviceId)}`;
  return issueKey ? `${base}?issue=${encodeURIComponent(issueKey)}` : base;
}
