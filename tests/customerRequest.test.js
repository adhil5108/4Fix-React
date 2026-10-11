import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  customerTimeline,
  groupRequests,
  isActiveRequest,
  requestActions,
} from '../src/utils/customerRequest.js';

const accepted = { hasPhone: true, hasBooking: true };

test('PENDING offers no primary action, only a (quiet) cancel', () => {
  assert.deepEqual(requestActions('PENDING'), { primary: null, secondary: [], tertiary: [], canCancel: true });
});

test('only PENDING can be cancelled', () => {
  for (const status of ['ACCEPTED', 'LOCATION_REACHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
    assert.equal(requestActions(status, accepted).canCancel, false, status);
  }
});

test('ACCEPTED: call first, chat second; call disappears without an authorized phone', () => {
  assert.deepEqual(requestActions('ACCEPTED', accepted), { primary: 'call', secondary: ['chat'], tertiary: [], canCancel: false });
  assert.deepEqual(requestActions('ACCEPTED', { hasBooking: true }).primary, 'chat');
  assert.deepEqual(requestActions('ACCEPTED', {}).primary, null);
});

test('LOCATION_REACHED keeps call and chat as subordinate actions', () => {
  assert.deepEqual(requestActions('LOCATION_REACHED', accepted), { primary: null, secondary: ['call', 'chat'], tertiary: [], canCancel: false });
});

test('IN_PROGRESS: chat first, call second', () => {
  assert.deepEqual(requestActions('IN_PROGRESS', accepted).primary, 'chat');
  assert.deepEqual(requestActions('IN_PROGRESS', accepted).secondary, ['call']);
});

test('COMPLETED: rate first until reviewed, then the invoice', () => {
  const before = requestActions('COMPLETED', accepted);
  assert.equal(before.primary, 'review');
  assert.deepEqual(before.secondary, ['invoice']);

  const after = requestActions('COMPLETED', { ...accepted, hasReview: true });
  assert.equal(after.primary, 'invoice');
  assert.deepEqual(after.secondary, ['yourReview']);
});

test('CANCELLED offers a new request and never provider contact', () => {
  const actions = requestActions('CANCELLED', accepted);
  assert.equal(actions.primary, 'newRequest');
  assert.deepEqual([...actions.secondary, ...actions.tertiary], []);
});

test('timeline: PENDING shows "sent" then an explicit, current waiting step', () => {
  const { stages, rank } = customerTimeline('PENDING');
  assert.deepEqual(stages.map((stage) => stage.status), ['SENT', 'WAITING', 'ACCEPTED', 'LOCATION_REACHED', 'IN_PROGRESS', 'COMPLETED']);
  assert.equal(stages[1].state, 'current');
  assert.equal(rank.PENDING, 0);
});

test('timeline: later statuses have no waiting step and rank to their own stage', () => {
  for (const status of ['ACCEPTED', 'LOCATION_REACHED', 'IN_PROGRESS', 'COMPLETED']) {
    const { stages, rank } = customerTimeline(status);
    assert.ok(!stages.some((stage) => stage.status === 'WAITING'), status);
    assert.equal(stages[rank[status]].status, status);
  }
  // COMPLETED is the last stage, so with reachedIsDone every step renders as done.
  const { stages, rank } = customerTimeline('COMPLETED');
  assert.equal(rank.COMPLETED, stages.length - 1);
});

test('grouping: active first, most recently changed first; past after', () => {
  const requests = [
    { id: 'done', status: 'COMPLETED', updatedAt: '2026-10-09T10:00:00Z' },
    { id: 'old-active', status: 'ACCEPTED', updatedAt: '2026-10-01T10:00:00Z' },
    { id: 'cancelled', status: 'CANCELLED', updatedAt: '2026-10-08T10:00:00Z' },
    { id: 'new-active', status: 'PENDING', createdAt: '2026-10-05T10:00:00Z' },
  ];
  const { active, past } = groupRequests(requests);
  assert.deepEqual(active.map((r) => r.id), ['new-active', 'old-active']);
  assert.deepEqual(past.map((r) => r.id), ['done', 'cancelled']);
  assert.deepEqual(groupRequests(undefined), { active: [], past: [] });
});

test('isActiveRequest', () => {
  assert.equal(isActiveRequest({ status: 'IN_PROGRESS' }), true);
  assert.equal(isActiveRequest({ status: 'COMPLETED' }), false);
  assert.equal(isActiveRequest(null), false);
});
