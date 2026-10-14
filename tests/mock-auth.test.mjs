import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import {
  AUTH_STORAGE_KEYS,
  createMockAuthStore,
  DEMO_CREDENTIALS,
  REMEMBER_ME_DURATION_MS,
} from '../src/features/authentication/services/mock_auth.js';
import { validatePassword } from '../src/features/authentication/validation/auth_validation.js';
import { createSafeStorage } from '../src/services/storage/local_storage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function fixture(overrides = {}) {
  const options = { localStorage: memoryStorage(), sessionStorage: memoryStorage(), crypto: webcrypto, ...overrides };
  return { ...options, store: createMockAuthStore(options), refresh: () => createMockAuthStore(options) };
}

test('registration normalizes profile, signs in, and restores the same user after refresh', async () => {
  const app = fixture();
  const { user } = await app.store.register('  Founder@Example.com ', 'FreshPassword1!', '  Avery Founder  ', { role: 'founder' });
  assert.equal(user.email, 'founder@example.com');
  assert.equal(user.full_name, 'Avery Founder');
  assert.equal(user.role, 'founder');
  assert.equal(user.assessment_completed, false);
  assert.deepEqual(app.refresh().getUser(), user);
  const saved = app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles);
  assert.equal(saved.includes('FreshPassword1!'), false);
  assert.match(JSON.parse(saved).find((account) => account.user.id === user.id).password_verifier, /^[a-f0-9]{64}$/);
});

test('duplicate emails are rejected regardless of whitespace or case', async () => {
  const { store } = fixture();
  await store.register('founder@example.com', 'FreshPassword1!', 'Avery Founder', { role: 'founder' });
  await assert.rejects(store.register(' FOUNDER@example.com ', 'OtherPassword2!', 'Other Founder', { role: 'founder' }), { message: 'This email is already registered. Please log in.' });
  await assert.rejects(store.register(' FOUNDER@LABX.DEMO ', 'OtherPassword2!', 'Other Founder', { role: 'founder' }), { message: 'This email is already registered. Please log in.' });
});

test('registration rejects invalid names, email, and short passwords without creating a session', async () => {
  const { store } = fixture();
  await assert.rejects(store.register('founder@example.com', 'FreshPassword1!', ' ', { role: 'founder' }), /full name/);
  await assert.rejects(store.register('bad-email', 'FreshPassword1!', 'Avery Founder', { role: 'founder' }), /valid email/);
  await assert.rejects(store.register('founder@example.com', 'short', 'Avery Founder', { role: 'founder' }), /9.20/);
  assert.equal(store.getUser(), null);
});

test('sign in checks the saved password and unknown accounts do not create sessions', async () => {
  const app = fixture();
  const { user } = await app.store.register('founder@example.com', 'FreshPassword1!', 'Avery Founder', { role: 'founder' });
  app.store.logout();
  await assert.rejects(app.store.login('founder@example.com', 'WrongPassword1!'), { message: 'Invalid email or password' });
  await assert.rejects(app.store.login('missing@example.com', 'FreshPassword1!'), { message: 'Invalid email or password' });
  assert.equal(app.store.getUser(), null);
  assert.deepEqual((await app.refresh().login(' FOUNDER@example.com ', 'FreshPassword1!')).user, user);
});

test('the built-in demo account signs in without registration', async () => {
  const app = fixture();
  const { user } = await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  assert.equal(user.id, 'demo-founder');
  assert.equal(app.refresh().getUser().id, 'demo-founder');
});

test('remember me false survives refresh in the tab but not a new tab session', async () => {
  const app = fixture();
  await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, { rememberMe: false });
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.ok(app.sessionStorage.getItem(AUTH_STORAGE_KEYS.session));
  assert.equal(app.refresh().getUser().id, 'demo-founder');
  const newTab = createMockAuthStore({ localStorage: app.localStorage, sessionStorage: memoryStorage(), crypto: webcrypto });
  assert.equal(newTab.getUser(), null);
});

test('remembered login restores in a new tab and logout removes both kinds of session', async () => {
  const app = fixture();
  await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  const newTab = createMockAuthStore({ localStorage: app.localStorage, sessionStorage: memoryStorage(), crypto: webcrypto });
  assert.equal(newTab.getUser().id, 'demo-founder');
  await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, { rememberMe: false });
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  app.store.logout();
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.equal(app.sessionStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.equal(app.refresh().getUser(), null);
});

test('assessment results belong to the signed-in founder and persist through refresh and sign in', async () => {
  const app = fixture();
  const { user } = await app.store.register('founder@example.com', 'FreshPassword1!', 'Avery Founder', { role: 'founder' });
  const result = { level: 3, title: 'Builder', score: 42 };
  const answers = { q1: 'Healthcare & MedTech', q2: 'I have built a prototype/MVP', q3: ['prototype'] };
  const completed = app.store.completeAssessment(result, answers);
  assert.equal(completed.id, user.id);
  assert.equal(completed.assessment_completed, true);
  assert.deepEqual(app.refresh().getUser().assessment_result, result);
  app.store.logout();
  const returningUser = (await app.store.login('founder@example.com', 'FreshPassword1!')).user;
  assert.deepEqual(returningUser.assessment_answers, answers);
  app.store.logout();
  const otherUser = (await app.store.register('other@example.com', 'OtherPassword1!', 'Other Founder', { role: 'founder' })).user;
  assert.equal(otherUser.assessment_completed, false);
  assert.equal(otherUser.assessment_result, null);
});

test('assessment saving requires sign in and valid result and answer objects', async () => {
  const { store } = fixture();
  assert.throws(() => store.completeAssessment({}, {}), /log in/);
  await store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  assert.throws(() => store.completeAssessment(null, {}), /Complete the assessment/);
  assert.throws(() => store.completeAssessment({}, []), /Complete the assessment/);
});

test('malformed saved data is ignored and the demo remains usable', async () => {
  const app = fixture();
  app.localStorage.setItem(AUTH_STORAGE_KEYS.profiles, '{invalid JSON');
  app.localStorage.setItem(AUTH_STORAGE_KEYS.session, JSON.stringify({ version: 1, userId: 'missing-user' }));
  app.sessionStorage.setItem(AUTH_STORAGE_KEYS.session, 'null');
  assert.equal(app.refresh().getUser(), null);
  app.localStorage.setItem(AUTH_STORAGE_KEYS.profiles, JSON.stringify([null, {}, { user: { id: 3 } }]));
  await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  assert.equal(app.store.getUser().id, 'demo-founder');
});

test('disabled browser storage falls back to memory for registration, assessment, and logout', async () => {
  const blockedStorage = {
    getItem() { throw new Error('Storage blocked'); },
    setItem() { throw new Error('Storage blocked'); },
    removeItem() { throw new Error('Storage blocked'); },
  };
  const app = fixture({ localStorage: createSafeStorage(blockedStorage), sessionStorage: createSafeStorage(blockedStorage) });
  await app.store.register('founder@example.com', 'FreshPassword1!', 'Avery Founder', { role: 'founder' });
  app.store.completeAssessment({ score: 42 }, { q1: 'Sustainability' });
  assert.equal(app.refresh().getUser().assessment_completed, true);
  app.store.logout();
  assert.equal(app.store.getUser(), null);
  assert.equal((await app.store.login('founder@example.com', 'FreshPassword1!')).user.full_name, 'Avery Founder');
});

test('failed storage writes and removals do not expose stale values during this session', () => {
  const backing = memoryStorage();
  backing.setItem('session', 'old');
  backing.setItem = () => { throw new Error('Quota exceeded'); };
  backing.removeItem = () => { throw new Error('Storage blocked'); };
  const storage = createSafeStorage(backing);
  storage.setItem('session', 'new');
  assert.equal(storage.getItem('session'), 'new');
  storage.removeItem('session');
  assert.equal(storage.getItem('session'), null);
});

test('another tab changing the remembered account cannot receive the previous account assessment', async () => {
  const shared = memoryStorage();
  const tabA = fixture({ localStorage: shared });
  const tabB = fixture({ localStorage: shared });
  const alice = (await tabA.store.register('alice@example.com', 'Password123!', 'Alice Founder', { role: 'founder' })).user;
  await tabB.store.register('bob@example.com', 'Password123!', 'Bob Founder', { role: 'founder' });
  assert.throws(() => tabA.store.completeAssessment({ score: 42 }, { q1: 1 }), /account changed/);
  assert.equal(tabB.store.getUser().assessment_completed, false);
  // The explicit UI identity also closes the race before a storage event rerenders it.
  assert.equal(tabA.store.getUser().email, 'bob@example.com');
  assert.throws(() => tabA.store.completeAssessment({ score: 42 }, { q1: 1 }, alice.id), /account changed/);
  await tabA.store.login('alice@example.com', 'Password123!');
  assert.equal(tabA.store.getUser().assessment_completed, false);
});

test('a tab-only session keeps its own account when another tab remembers a different account', async () => {
  const shared = memoryStorage();
  const tabA = fixture({ localStorage: shared });
  const tabB = fixture({ localStorage: shared });
  const alice = (await tabA.store.register('alice@example.com', 'Password123!', 'Alice Founder', { role: 'founder' })).user;
  await tabA.store.login('alice@example.com', 'Password123!', { rememberMe: false });
  await tabB.store.register('bob@example.com', 'Password123!', 'Bob Founder', { role: 'founder' });
  assert.equal(tabA.store.getUser().id, alice.id);
  assert.equal(tabA.store.completeAssessment({ score: 42 }, { q1: 1 }).id, alice.id);
  assert.equal(tabB.store.getUser().assessment_completed, false);
});

test('a profile with missing or malformed assessment data restores as incomplete', async () => {
  const app = fixture();
  const { user } = await app.store.register('founder@example.com', 'Password123!', 'Avery Founder', { role: 'founder' });
  const profiles = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles));
  const account = profiles.find((entry) => entry.user.id === user.id);
  account.user.assessment_completed = true;
  account.user.assessment_answers = { q1: 1 };
  for (const invalidResult of [null, [], 'broken', false]) {
    account.user.assessment_result = invalidResult;
    app.localStorage.setItem(AUTH_STORAGE_KEYS.profiles, JSON.stringify(profiles));
    assert.equal(app.refresh().getUser().assessment_completed, false);
    assert.equal(app.refresh().getUser().assessment_result, null);
  }
  account.user.assessment_result = { score: 42 };
  account.user.assessment_answers = null;
  app.localStorage.setItem(AUTH_STORAGE_KEYS.profiles, JSON.stringify(profiles));
  assert.equal(app.refresh().getUser().assessment_completed, false);
});

test('passwords require 9–20 characters with uppercase, lowercase, number, and special character', () => {
  assert.equal(validatePassword('Abcdefg1!'), '');
  assert.equal(validatePassword('Abcdefghijklmnopqr1!'), '');
  for (const invalid of ['', 'Abcdef1!', 'Abcdefghijklmnopqrs12!', 'abcdefgh1!', 'ABCDEFGH1!', 'Abcdefghi!', 'Abcdefghi1', 'Abcdefgh1 ']) {
    assert.notEqual(validatePassword(invalid), '', invalid);
  }
});

test('role is required, permits only founder and mentor, and a one-character name is valid', async () => {
  const app = fixture();
  for (const role of [undefined, '', 'admin', 'investor', 'teammate', 'Founder']) {
    await assert.rejects(app.store.register('new@example.com', 'Password123!', 'A', { role }), /Choose Founder or Mentor/);
  }
  const { user } = await app.store.register('mentor@example.com', 'Password123!', ' M ', { role: 'mentor' });
  assert.equal(user.full_name, 'M');
  assert.equal(user.role, 'mentor');
  assert.equal(app.refresh().getUser().role, 'mentor');
  app.store.logout();
  assert.equal((await app.store.login('mentor@example.com', 'Password123!')).user.role, 'mentor');
  assert.throws(() => app.store.skipAssessment(), /for Founders/);
  assert.throws(() => app.store.completeAssessment({ score: 42 }, { q1: 1 }), /for Founders/);
});

test('a corrupt role is discarded instead of silently converted to a founder', async () => {
  const app = fixture();
  const { user } = await app.store.register('mentor@example.com', 'Password123!', 'Mentor', { role: 'mentor' });
  const profiles = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles));
  profiles.find((entry) => entry.user.id === user.id).user.role = 'investor';
  app.localStorage.setItem(AUTH_STORAGE_KEYS.profiles, JSON.stringify(profiles));
  assert.equal(app.refresh().getUser(), null);
});

test('remembered registration and login expire at 10 days without sliding on refresh', async () => {
  let timestamp = Date.UTC(2026, 9, 14);
  const app = fixture({ now: () => timestamp });
  await app.store.register('founder@example.com', 'Password123!', 'Founder', { role: 'founder' });
  const registeredAt = timestamp;
  const saved = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.session));
  assert.equal(saved.expiresAt, registeredAt + REMEMBER_ME_DURATION_MS);
  timestamp = saved.expiresAt - 1;
  assert.ok(app.refresh().getUser());
  assert.equal(app.store.getSessionExpiresAt(), saved.expiresAt);
  timestamp += 1;
  assert.equal(app.refresh().getUser(), null);
  await app.store.login('founder@example.com', 'Password123!');
  assert.equal(app.store.getSessionExpiresAt(), timestamp + REMEMBER_ME_DURATION_MS);
  timestamp += REMEMBER_ME_DURATION_MS;
  assert.equal(app.store.getUser(), null);
});

test('unchecked Remember Me during registration uses only the current tab session', async () => {
  const app = fixture();
  await app.store.register('founder@example.com', 'Password123!', 'Founder', { role: 'founder', rememberMe: false });
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.equal(JSON.parse(app.sessionStorage.getItem(AUTH_STORAGE_KEYS.session)).expiresAt, null);
  assert.ok(app.refresh().getUser());
  assert.equal(createMockAuthStore({ localStorage: app.localStorage, sessionStorage: memoryStorage() }).getUser(), null);
});

test('skipping persists separately from completion and completed answers cannot be overwritten', async () => {
  const app = fixture();
  await app.store.register('founder@example.com', 'Password123!', 'Founder', { role: 'founder' });
  app.localStorage.setItem('labx.assessment.draft.fixture', 'existing draft');
  const skipped = app.store.skipAssessment();
  assert.equal(skipped.assessment_skipped, true);
  assert.equal(skipped.assessment_completed, false);
  assert.equal(app.refresh().getUser().assessment_skipped, true);
  assert.equal(app.localStorage.getItem('labx.assessment.draft.fixture'), 'existing draft');
  const original = app.store.completeAssessment({ score: 42 }, { q1: 1 });
  assert.equal(original.assessment_skipped, false);
  assert.throws(() => app.store.completeAssessment({ score: 99 }, { q1: 2 }), /Completed answers cannot be changed/);
  assert.throws(() => app.store.skipAssessment(), /Completed answers cannot be changed/);
  assert.deepEqual(app.refresh().getUser().assessment_answers, { q1: 1 });
});

test('a mock reset link is one-use, persists through refresh, and replaces credentials without deleting profile data', async () => {
  const app = fixture();
  const { user } = await app.store.register('founder@example.com', 'Password123!', 'Founder', { role: 'founder' });
  app.store.completeAssessment({ score: 42 }, { q1: 1 });
  const { resetToken, email } = await app.store.requestPasswordReset(' FOUNDER@example.com ');
  assert.equal(email, user.email);
  assert.match(resetToken, /^[a-f0-9]{32}$/);
  await assert.rejects(app.store.resetPassword(resetToken, 'weak'), /9–20/);
  await app.refresh().resetPassword(resetToken, 'UpdatedPassword1!');
  assert.equal(app.store.getUser(), null);
  await assert.rejects(app.store.login(user.email, 'Password123!'), { message: 'Invalid email or password' });
  const restored = (await app.store.login(user.email, 'UpdatedPassword1!')).user;
  assert.equal(restored.id, user.id);
  assert.deepEqual(restored.assessment_answers, { q1: 1 });
  await assert.rejects(app.store.resetPassword(resetToken, 'AnotherPassword1!'), /invalid or has already been used/);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles).includes('UpdatedPassword1!'), false);
});

test('requesting another reset link invalidates the prior link, and unknown emails receive no token', async () => {
  const { store } = fixture();
  const first = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const second = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  await assert.rejects(store.resetPassword(first.resetToken, 'UpdatedPassword1!'), /invalid or has already been used/);
  await store.resetPassword(second.resetToken, 'UpdatedPassword1!');
  assert.equal((await store.login(DEMO_CREDENTIALS.email, 'UpdatedPassword1!')).user.id, 'demo-founder');
  assert.deepEqual(await store.requestPasswordReset('unknown@example.com'), { email: 'unknown@example.com' });
  await assert.rejects(store.resetPassword('made-up-token', 'UpdatedPassword1!'), /invalid or has already been used/);
});

test('password reset invalidates other tabs including tab-only sessions, but preserves another account session', async () => {
  const shared = memoryStorage();
  const tabA = fixture({ localStorage: shared });
  const tabB = fixture({ localStorage: shared });
  await tabA.store.register('alice@example.com', 'Password123!', 'Alice', { role: 'founder', rememberMe: false });
  await tabB.store.register('bob@example.com', 'Password123!', 'Bob', { role: 'mentor' });
  const { resetToken } = await tabB.store.requestPasswordReset('alice@example.com');
  await tabB.store.resetPassword(resetToken, 'UpdatedPassword1!');
  // Alice's invalidated tab-only session can no longer override the shared Bob session.
  assert.equal(tabA.store.getUser().email, 'bob@example.com');
  assert.equal(tabB.store.getUser().email, 'bob@example.com');
  await tabA.store.login('alice@example.com', 'UpdatedPassword1!', { rememberMe: false });
  const next = await tabB.store.requestPasswordReset('alice@example.com');
  await tabB.store.resetPassword(next.resetToken, 'AnotherPassword1!');
  assert.throws(() => tabA.store.completeAssessment({ score: 42 }, { q1: 1 }), /log in/);
});

test('legacy mock placement migrates to the approved sample while preserving completed answers and domain', async () => {
  const app = fixture();
  const { user } = await app.store.register('founder@example.com', 'Password123!', 'Founder', { role: 'founder' });
  const profiles = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles));
  const savedUser = profiles.find((entry) => entry.user.id === user.id).user;
  savedUser.assessment_completed = true;
  savedUser.assessment_answers = { q1: 8 };
  savedUser.assessment_result = { domain: 'Sustainability', guild: 'Sustainability Guild', stage: 'Scale', level: 15, score: 100, isMock: true, version: 1 };
  app.localStorage.setItem(AUTH_STORAGE_KEYS.profiles, JSON.stringify(profiles));
  const restored = app.refresh().getUser();
  assert.equal(restored.assessment_completed, true);
  assert.deepEqual(restored.assessment_answers, { q1: 8 });
  assert.deepEqual(restored.assessment_result, {
    domain: 'Sustainability', guild: 'Sustainability Guild', stage: 'Launch', level: 5,
    placement_status: 'mock', isMock: true, version: 3,
  });
  assert.throws(() => app.store.completeAssessment({ domain: 'FinTech' }, { q1: 6 }), /Completed answers cannot be changed/);
});
