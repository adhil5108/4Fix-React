import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePhone, validateContact, validateProblem } from '../src/utils/bookingValidation.js';
import en from '../src/i18n/locales/en/customer.js';
import ml from '../src/i18n/locales/ml/customer.js';

const t = (key) => key;

test('the problem step accepts valid details without asking for location or contact', () => {
  assert.deepEqual(validateProblem({ description: 'AC is leaking water' }, 'LEAKING', [], 10, t), {});
});

test('problem errors are ordered for focus and enforce description and attachment limits', () => {
  assert.deepEqual(Object.keys(validateProblem({ description: '  ' }, '', Array(11), 10, t)), ['issue', 'description', 'attachments']);
  assert.equal(validateProblem({ description: '1234' }, 'OTHER', [], 10, t).description, 'customer.book.errors.descriptionShort');
  assert.deepEqual(validateProblem({ description: '12345' }, 'OTHER', [], 10, t), {});
  assert.deepEqual(validateProblem({ description: 'x'.repeat(2000) }, 'OTHER', Array(10), 10, t), {});
  assert.equal(validateProblem({ description: 'x'.repeat(2001) }, 'OTHER', [], 10, t).description, 'customer.book.errors.descriptionLong');
});

test('contact details are required before sending and phone formatting is normalized', () => {
  assert.deepEqual(Object.keys(validateContact({customerName:' ',customerPhone:''}, t)), ['customerName', 'customerPhone']);
  assert.equal(normalizePhone(' +91 (98765) 43210 '), '+919876543210');
  assert.deepEqual(validateContact({customerName:'Test Customer',customerPhone:'+91 (98765) 43210'}, t), {});
  for (const phone of ['00000000', '1234567', '+1234567890123456', '98765abc10']) {
    assert.equal(validateContact({customerName:'Test Customer',customerPhone:phone}, t).customerPhone, 'customer.book.errors.phoneInvalid');
  }
});

test('the new step labels are translated in English and Malayalam', () => {
  assert.deepEqual(Object.keys(en.book.steps).sort(), Object.keys(ml.book.steps).sort());
  for (const language of [en, ml]) {
    for (const value of Object.values(language.book.steps)) assert.ok(value.trim());
    assert.ok(language.book.steps.count.includes('{{step}}'));
  }
});
