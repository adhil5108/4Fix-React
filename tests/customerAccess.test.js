import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

// customerAccess.js reads the browser globals at call time; a minimal stand-in is enough.
const storage = new Map();
let storageBlocked = false;
const history = [];

globalThis.window = {
  localStorage: {
    getItem: (key) => {
      if (storageBlocked) throw new Error('blocked');
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem: (key, value) => {
      if (storageBlocked) throw new Error('blocked');
      storage.set(key, value);
    },
  },
  location: { origin: 'https://4fix.test', pathname: '/requests/r1', search: '', hash: '' },
  history: {
    state: null,
    replaceState: (_state, _title, url) => history.push(url),
  },
};

const access = await import('../src/services/customerAccess.js');

beforeEach(() => {
  storage.clear();
  storageBlocked = false;
  history.length = 0;
  window.location.hash = '';
  // Reset the module's in-memory copy by writing an empty list.
  access.listSavedRequests().forEach((entry) => access.forgetRequest(entry.requestId));
});

test('saves, links a booking and finds the token by request or booking', () => {
  access.saveRequestAccess('r1', 'tok-1');
  access.linkBooking('r1', 'b1');
  assert.equal(access.tokenForRequest('r1'), 'tok-1');
  assert.equal(access.tokenForBooking('b1'), 'tok-1');
  assert.equal(access.requestIdForBooking('b1'), 'r1');
});

test('blocked storage: the request just sent still works in this tab', () => {
  storageBlocked = true;
  access.saveRequestAccess('r2', 'tok-2');
  assert.equal(access.tokenForRequest('r2'), 'tok-2');
  access.linkBooking('r2', 'b2');
  assert.equal(access.tokenForBooking('b2'), 'tok-2');
  assert.equal(access.listSavedRequests().length, 1);
});

test('private link carries the token in the fragment, never the path or query', () => {
  const link = access.trackingLink('r1', 'tok/1');
  assert.equal(link, 'https://4fix.test/requests/r1#access=tok%2F1');
});

test('adopting a link saves the token and strips it from the address bar', () => {
  window.location.hash = '#access=tok-3';
  access.adoptTokenFromLocation('r3');
  assert.equal(access.tokenForRequest('r3'), 'tok-3');
  assert.deepEqual(history, ['/requests/r1']);
});

test('forgetting a request removes it', () => {
  access.saveRequestAccess('r4', 'tok-4');
  access.forgetRequest('r4');
  assert.equal(access.tokenForRequest('r4'), null);
});
