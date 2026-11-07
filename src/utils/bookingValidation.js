// Keep the two request steps independent: contact/location errors must not block
// the customer while they are still describing the problem.
export function normalizePhone(value) {
  return value.trim().replace(/[\s().-]/g, '');
}

export function validateProblem(form, issueKey, attachments, maxAttachments, t) {
  const errors = {};
  if (!issueKey) errors.issue = t('customer.book.errors.issueRequired');

  const length = form.description.trim().length;
  if (length === 0) errors.description = t('customer.book.errors.descriptionRequired');
  else if (length < 5) errors.description = t('customer.book.errors.descriptionShort');
  else if (length > 2000) errors.description = t('customer.book.errors.descriptionLong');

  if (attachments.length > maxAttachments) {
    errors.attachments = t('customer.book.errors.attachments', { max: maxAttachments });
  }
  return errors;
}

export function validateContact(form, t) {
  const errors = {};
  const name = form.customerName.trim();
  if (!name) errors.customerName = t('customer.book.errors.nameRequired');
  else if (name.length < 2) errors.customerName = t('customer.book.errors.nameShort');
  else if (name.length > 120) errors.customerName = t('customer.book.errors.nameLong');

  const phone = normalizePhone(form.customerPhone);
  if (!phone) errors.customerPhone = t('customer.book.errors.phoneRequired');
  else if (!/^\+?[1-9]\d{7,14}$/.test(phone)) errors.customerPhone = t('customer.book.errors.phoneInvalid');
  return errors;
}
