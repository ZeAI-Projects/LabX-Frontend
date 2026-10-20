import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import {
  AUTH_STORAGE_KEYS,
  createMockAuthStore,
  DEMO_CREDENTIALS,
  REMEMBER_ME_DURATION_MS,
  RESET_CODE_DURATION_MS,
  RESET_CODE_MAX_ATTEMPTS,
  REGISTRATION_CODE_DURATION_MS,
  REGISTRATION_CODE_MAX_ATTEMPTS,
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

test('profile edits persist identity without changing role, credentials, points or session expiry', async () => {
  const app = fixture();
  const { user } = await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  const expiry = app.store.getSessionExpiresAt();
  const updated = app.store.updateProfileIdentity({
    full_name: '  Avery Builder  ', username: ' AVERY_BUILDER ', role: 'investor',
    email: 'changed@example.com', total_points: 9000, assessment_completed: true,
  }, user.id);
  assert.deepEqual(updated, { ...user, full_name: 'Avery Builder', username: 'avery_builder' });
  assert.deepEqual(app.refresh().getUser(), updated);
  assert.equal(app.store.getSessionExpiresAt(), expiry);
  app.store.logout();
  assert.deepEqual((await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password)).user, updated);
});

test('username collisions are case-insensitive and invalid edits leave identity unchanged', async () => {
  const { store } = fixture();
  const first = (await store.register('avery@example.com', 'FreshPassword1!', 'Avery', { role: 'founder' })).user;
  store.updateProfileIdentity({ full_name: 'Avery', username: 'unique_builder' }, first.id);
  const second = (await store.register('other@example.com', 'FreshPassword1!', 'Other', { role: 'mentor' })).user;
  for (const username of [' UNIQUE_BUILDER ', 'founder']) {
    assert.throws(() => store.updateProfileIdentity({ full_name: 'Changed', username }, second.id), /already taken/);
  }
  for (const username of ['a', 'invalid name', 'a'.repeat(31), 'builder@example.com']) {
    assert.throws(() => store.updateProfileIdentity({ full_name: 'Changed', username }, second.id), /3–30/);
  }
  assert.throws(() => store.updateProfileIdentity({ full_name: '', username: 'available' }, second.id), /display name/);
  assert.deepEqual(store.getUser(), second);
});

test('new registrations allocate unique valid usernames across email domains', async () => {
  const { store } = fixture();
  const first = (await store.register('shared.name@one.example', 'FreshPassword1!', 'First', { role: 'founder' })).user;
  const second = (await store.register('shared.name@two.example', 'FreshPassword1!', 'Second', { role: 'investor' })).user;
  const reserved = (await store.register('founder@example.com', 'FreshPassword1!', 'Third', { role: 'mentor' })).user;
  assert.equal(first.username, 'shared_name');
  assert.equal(second.username, 'shared_name_2');
  assert.equal(reserved.username, 'founder_2');
});

test('stale profile edits cannot modify a newly signed-in account or revive a signed-out one', async () => {
  const app = fixture();
  const { user } = await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  const otherTab = app.refresh();
  const { user: other } = await otherTab.register('next@example.com', 'FreshPassword1!', 'Next', { role: 'founder' });
  assert.throws(() => app.store.updateProfileIdentity({ full_name: 'Wrong', username: 'wrong' }, user.id), /account changed/);
  assert.throws(() => app.store.updateProfileIdentity({ full_name: 'Wrong', username: 'wrong' }), /account changed/);
  assert.deepEqual(otherTab.getUser(), other);
  otherTab.logout();
  assert.throws(() => app.store.updateProfileIdentity({ full_name: 'Wrong', username: 'wrong' }, other.id), /account changed/);
});

function pauseDigestOnce(matches) {
  let markStarted;
  let resume;
  let paused = false;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const waiting = new Promise((resolve) => { resume = resolve; });
  return {
    started,
    resume: () => resume(),
    crypto: {
      getRandomValues: (values) => webcrypto.getRandomValues(values),
      subtle: {
        async digest(algorithm, data) {
          if (!paused && matches(new TextDecoder().decode(data))) {
            paused = true;
            markStarted();
            await waiting;
          }
          return webcrypto.subtle.digest(algorithm, data);
        },
      },
    },
  };
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
  await assert.rejects(store.register(' FOUNDER@example.com ', 'OtherPassword2!', 'Other Founder', { role: 'founder' }), { message: 'An account with this email address already exists. Please sign in.' });
  await assert.rejects(store.register(' FOUNDER@LABX.DEMO ', 'OtherPassword2!', 'Other Founder', { role: 'founder' }), { message: 'An account with this email address already exists. Please sign in.' });
});

test('registration rejects invalid names, email, and short passwords without creating a session', async () => {
  const { store } = fixture();
  await assert.rejects(store.register('founder@example.com', 'FreshPassword1!', ' ', { role: 'founder' }), /full name/);
  await assert.rejects(store.register('bad-email', 'FreshPassword1!', 'Avery Founder', { role: 'founder' }), /valid email/);
  await assert.rejects(store.register('founder@example.com', 'short', 'Avery Founder', { role: 'founder' }), /between 9 and 20/);
  assert.equal(store.getUser(), null);
});

test('sign in checks the saved password and unknown accounts do not create sessions', async () => {
  const app = fixture();
  const { user } = await app.store.register('founder@example.com', 'FreshPassword1!', 'Avery Founder', { role: 'founder' });
  app.store.logout();
  await assert.rejects(app.store.login('founder@example.com', 'WrongPassword1!'), { message: 'The email address or password is incorrect.' });
  await assert.rejects(app.store.login('missing@example.com', 'FreshPassword1!'), { message: 'The email address or password is incorrect.' });
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
  assert.throws(() => store.completeAssessment({}, {}), /sign in/);
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

test('role is required, permits founder, mentor, and investor, and a one-character name is valid', async () => {
  const app = fixture();
  for (const role of [undefined, '', 'admin', 'teammate', 'Founder']) {
    await assert.rejects(app.store.register('new@example.com', 'Password123!', 'A', { role }), /Choose Founder, Mentor, or Investor/);
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

test('investor registration, refresh, and sign in preserve the selected role', async () => {
  const app = fixture();
  const { user } = await app.store.register(' Investor@example.com ', 'Password123!', 'I', { role: 'investor' });
  assert.equal(user.role, 'investor');
  assert.equal(user.email, 'investor@example.com');
  assert.equal(app.refresh().getUser().role, 'investor');
  app.store.logout();
  assert.equal((await app.store.login(user.email, 'Password123!')).user.role, 'investor');
  assert.throws(() => app.store.skipAssessment(), /for Founders/);
  assert.throws(() => app.store.completeAssessment({ score: 42 }, { q1: 1 }), /for Founders/);
});

test('a corrupt role is discarded instead of silently converted to a founder', async () => {
  const app = fixture();
  const { user } = await app.store.register('mentor@example.com', 'Password123!', 'Mentor', { role: 'mentor' });
  const profiles = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles));
  profiles.find((entry) => entry.user.id === user.id).user.role = 'admin';
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

test('a mock reset code is one-use, persists through refresh, and replaces credentials without deleting profile data', async () => {
  const app = fixture();
  const { user } = await app.store.register('founder@example.com', 'Password123!', 'Founder', { role: 'founder' });
  app.store.completeAssessment({ score: 42 }, { q1: 1 });
  const { demoCode, email, expiresAt } = await app.store.requestPasswordReset(' FOUNDER@example.com ');
  assert.equal(email, user.email);
  assert.match(demoCode, /^\d{6}$/);
  assert.ok(expiresAt > Date.now());
  const challenge = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles)).find((account) => account.user.id === user.id).reset_challenge;
  assert.match(challenge.verifier, /^[a-f0-9]{64}$/);
  assert.equal(Object.values(challenge).includes(demoCode), false, 'The code is not stored in plaintext');
  await assert.rejects(app.store.resetPassword(email, demoCode, 'weak'), /between 9 and 20/);
  await app.refresh().resetPassword(email, demoCode, 'UpdatedPassword1!');
  assert.equal(app.store.getUser(), null);
  await assert.rejects(app.store.login(user.email, 'Password123!'), { message: 'The email address or password is incorrect.' });
  const restored = (await app.store.login(user.email, 'UpdatedPassword1!')).user;
  assert.equal(restored.id, user.id);
  assert.deepEqual(restored.assessment_answers, { q1: 1 });
  await assert.rejects(app.store.resetPassword(email, demoCode, 'AnotherPassword1!'), /invalid or has already been used/);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles).includes('UpdatedPassword1!'), false);
});

test('requesting another reset code invalidates the prior code', async () => {
  const { store } = fixture();
  const first = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const second = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  assert.notEqual(first.demoCode, second.demoCode);
  await assert.rejects(store.resetPassword(first.email, first.demoCode, 'UpdatedPassword1!'), /invalid or has already been used/);
  await store.resetPassword(second.email, second.demoCode, 'UpdatedPassword1!');
  assert.equal((await store.login(DEMO_CREDENTIALS.email, 'UpdatedPassword1!')).user.id, 'demo-founder');
});

test('malformed and unregistered recovery emails return the same requested validation message', async () => {
  const app = fixture();
  for (const email of ['', 'bad-email', 'unknown@example.com']) {
    await assert.rejects(app.store.requestPasswordReset(email), { message: 'This email is invalid.' });
    await assert.rejects(app.store.resetPassword(email, '000000', 'UpdatedPassword1!'), { message: 'This email is invalid.' });
  }
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles), null);
  assert.equal(app.store.getUser(), null);
});

test('six-digit verification codes preserve leading zeros', async () => {
  const crypto = {
    subtle: webcrypto.subtle,
    getRandomValues: (values) => values instanceof Uint32Array ? values.fill(42) : webcrypto.getRandomValues(values),
  };
  const { store } = fixture({ crypto });
  const result = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  assert.equal(result.demoCode, '000042');
  await store.resetPassword(result.email, result.demoCode, 'UpdatedPassword1!');
  assert.equal((await store.login(result.email, 'UpdatedPassword1!')).user.id, 'demo-founder');
});

test('wrong or malformed codes do not change credentials or consume a valid code', async () => {
  const { store } = fixture();
  await store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  const result = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const wrongCode = result.demoCode === '000000' ? '000001' : '000000';
  for (const code of ['', '12345', '1234567', 'abcdef', 123456]) {
    await assert.rejects(store.resetPassword(result.email, code, 'UpdatedPassword1!'), /six-digit verification code/);
  }
  await assert.rejects(store.resetPassword(result.email, wrongCode, 'UpdatedPassword1!'), /invalid or has already been used/);
  assert.equal(store.getUser().id, 'demo-founder');
  assert.equal((await store.login(result.email, DEMO_CREDENTIALS.password)).user.id, 'demo-founder');
  await store.resetPassword(result.email, result.demoCode, 'UpdatedPassword1!');
});

test('verification codes expire exactly ten minutes after issue', async () => {
  let timestamp = Date.UTC(2026, 9, 20);
  const { store } = fixture({ now: () => timestamp });
  const expired = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  assert.equal(expired.expiresAt, timestamp + RESET_CODE_DURATION_MS);
  timestamp = expired.expiresAt;
  await assert.rejects(store.resetPassword(expired.email, expired.demoCode, 'UpdatedPassword1!'), /has expired/);
  assert.equal((await store.login(expired.email, DEMO_CREDENTIALS.password)).user.id, 'demo-founder');
  const valid = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  timestamp = valid.expiresAt - 1;
  await store.resetPassword(valid.email, valid.demoCode, 'UpdatedPassword1!');
});

test('five incorrect attempts lock the code and a resend restores recovery', async () => {
  const app = fixture();
  const result = await app.store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const wrongCode = result.demoCode === '000000' ? '000001' : '000000';
  for (let attempt = 1; attempt <= RESET_CODE_MAX_ATTEMPTS; attempt++) {
    await assert.rejects(app.refresh().resetPassword(result.email, wrongCode, 'UpdatedPassword1!'),
      attempt === RESET_CODE_MAX_ATTEMPTS ? /Too many incorrect attempts/ : /invalid or has already been used/);
  }
  await assert.rejects(app.store.resetPassword(result.email, result.demoCode, 'UpdatedPassword1!'), /Too many incorrect attempts/);
  assert.equal((await app.store.login(result.email, DEMO_CREDENTIALS.password)).user.id, 'demo-founder');
  const next = await app.store.requestPasswordReset(result.email);
  await app.store.resetPassword(next.email, next.demoCode, 'UpdatedPassword1!');
});

test('concurrent incorrect attempts cannot overwrite each other or bypass the limit', async () => {
  const app = fixture();
  const result = await app.store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const wrongCode = result.demoCode === '000000' ? '000001' : '000000';
  const attempts = await Promise.allSettled(Array.from({ length: RESET_CODE_MAX_ATTEMPTS + 2 }, () =>
    app.refresh().resetPassword(result.email, wrongCode, 'UpdatedPassword1!')));
  assert.ok(attempts.every((attempt) => attempt.status === 'rejected'));
  const saved = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles)).find((account) => account.user.email === result.email);
  assert.equal(saved.reset_challenge.attempts, RESET_CODE_MAX_ATTEMPTS);
  await assert.rejects(app.store.resetPassword(result.email, result.demoCode, 'UpdatedPassword1!'), /Too many incorrect attempts/);
});

test('a slower recovery request cannot replace the more recent code', async () => {
  const pause = pauseDigestOnce((text) => /:\d{6}$/.test(text));
  const { store } = fixture({ crypto: pause.crypto });
  const first = store.requestPasswordReset(DEMO_CREDENTIALS.email);
  await pause.started;
  const second = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const rejected = assert.rejects(first, /newer verification code/);
  pause.resume();
  await rejected;
  await store.resetPassword(second.email, second.demoCode, 'UpdatedPassword1!');
});

test('resending while a password hash is pending prevents the old reset from completing', async () => {
  const pause = pauseDigestOnce((text) => text.endsWith(':InterruptedPass1!'));
  const { store } = fixture({ crypto: pause.crypto });
  const first = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const pending = store.resetPassword(first.email, first.demoCode, 'InterruptedPass1!');
  await pause.started;
  const next = await store.requestPasswordReset(first.email);
  const rejected = assert.rejects(pending, /invalid or has already been used/);
  pause.resume();
  await rejected;
  assert.equal((await store.login(first.email, DEMO_CREDENTIALS.password)).user.id, 'demo-founder');
  await store.resetPassword(next.email, next.demoCode, 'UpdatedPassword1!');
});

test('a code expiring while its password hash is pending cannot change the password', async () => {
  let timestamp = Date.UTC(2026, 9, 20);
  const pause = pauseDigestOnce((text) => text.endsWith(':InterruptedPass1!'));
  const { store } = fixture({ crypto: pause.crypto, now: () => timestamp });
  const result = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const pending = store.resetPassword(result.email, result.demoCode, 'InterruptedPass1!');
  await pause.started;
  timestamp = result.expiresAt;
  const rejected = assert.rejects(pending, /has expired/);
  pause.resume();
  await rejected;
  assert.equal((await store.login(result.email, DEMO_CREDENTIALS.password)).user.id, 'demo-founder');
});

test('attempt exhaustion during a valid reset hash is rechecked before changing credentials', async () => {
  const pause = pauseDigestOnce((text) => text.endsWith(':InterruptedPass1!'));
  const { store } = fixture({ crypto: pause.crypto });
  const result = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const pending = store.resetPassword(result.email, result.demoCode, 'InterruptedPass1!');
  await pause.started;
  const wrongCode = result.demoCode === '000000' ? '000001' : '000000';
  await Promise.allSettled(Array.from({ length: RESET_CODE_MAX_ATTEMPTS }, () =>
    store.resetPassword(result.email, wrongCode, 'UpdatedPassword1!')));
  const rejected = assert.rejects(pending, /Too many incorrect attempts/);
  pause.resume();
  await rejected;
  assert.equal((await store.login(result.email, DEMO_CREDENTIALS.password)).user.id, 'demo-founder');
});

test('concurrent correct resets consume the code only once', async () => {
  const { store } = fixture();
  const result = await store.requestPasswordReset(DEMO_CREDENTIALS.email);
  const passwords = ['UpdatedPassword1!', 'AnotherPassword1!'];
  const resets = await Promise.allSettled(passwords.map((password) => store.resetPassword(result.email, result.demoCode, password)));
  assert.equal(resets.filter((reset) => reset.status === 'fulfilled').length, 1);
  assert.equal(resets.filter((reset) => reset.status === 'rejected').length, 1);
  const successfulPassword = passwords[resets.findIndex((reset) => reset.status === 'fulfilled')];
  const rejectedPassword = passwords[resets.findIndex((reset) => reset.status === 'rejected')];
  assert.equal((await store.login(result.email, successfulPassword)).user.id, 'demo-founder');
  await assert.rejects(store.login(result.email, rejectedPassword), /The email address or password is incorrect./);
});

test('password reset invalidates other tabs including tab-only sessions, but preserves another account session', async () => {
  const shared = memoryStorage();
  const tabA = fixture({ localStorage: shared });
  const tabB = fixture({ localStorage: shared });
  await tabA.store.register('alice@example.com', 'Password123!', 'Alice', { role: 'founder', rememberMe: false });
  await tabB.store.register('bob@example.com', 'Password123!', 'Bob', { role: 'mentor' });
  const { demoCode } = await tabB.store.requestPasswordReset('alice@example.com');
  await tabB.store.resetPassword('alice@example.com', demoCode, 'UpdatedPassword1!');
  // Alice's invalidated tab-only session can no longer override the shared Bob session.
  assert.equal(tabA.store.getUser().email, 'bob@example.com');
  assert.equal(tabB.store.getUser().email, 'bob@example.com');
  await tabA.store.login('alice@example.com', 'UpdatedPassword1!', { rememberMe: false });
  const next = await tabB.store.requestPasswordReset('alice@example.com');
  await tabB.store.resetPassword(next.email, next.demoCode, 'AnotherPassword1!');
  assert.throws(() => tabA.store.completeAssessment({ score: 42 }, { q1: 1 }), /sign in/);
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

test('requesting signup stores only pending digests without creating an account or session', async () => {
  const app = fixture();
  const result = await app.store.requestRegistration('  New@Example.com ', 'UniquePassword1!', ' New Founder ', { role: 'founder' });
  assert.equal(result.email, 'new@example.com');
  assert.match(result.demoCode, /^\d{6}$/);
  assert.equal(app.store.getUser(), null);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles), null);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.equal(app.sessionStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  const saved = app.localStorage.getItem(AUTH_STORAGE_KEYS.registrations);
  assert.equal(saved.includes('UniquePassword1!'), false);
  const [pending] = JSON.parse(saved);
  assert.equal(pending.full_name, 'New Founder');
  assert.match(pending.password_verifier, /^[a-f0-9]{64}$/);
  assert.match(pending.challenge.verifier, /^[a-f0-9]{64}$/);
  assert.equal(Object.values(pending.challenge).includes(result.demoCode), false);
  await assert.rejects(app.store.login(result.email, 'UniquePassword1!'), /The email address or password is incorrect./);
});

test('signup verification survives refresh, creates the account once, and honors Remember Me', async () => {
  let timestamp = Date.UTC(2026, 9, 20);
  const app = fixture({ now: () => timestamp });
  const pending = await app.store.requestRegistration('new@example.com', 'Password123!', 'New Mentor', { role: 'mentor' });
  timestamp += 1000;
  const { user } = await app.refresh().verifyRegistration(' NEW@example.com ', pending.demoCode);
  assert.equal(user.full_name, 'New Mentor');
  assert.equal(user.role, 'mentor');
  assert.equal(user.email_verified, true);
  assert.equal(user.onboarding_completed, false);
  assert.equal(app.refresh().getUser().id, user.id);
  assert.equal(app.store.getSessionExpiresAt(), timestamp + REMEMBER_ME_DURATION_MS);
  assert.deepEqual(JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.registrations)), []);
  await assert.rejects(app.store.verifyRegistration(pending.email, pending.demoCode), /No pending signup/);
  app.store.logout();
  assert.equal((await app.store.login(pending.email, 'Password123!')).user.id, user.id);
});

test('unverified signup leaves an existing session intact and verified tab-only signup uses session storage', async () => {
  const app = fixture();
  await app.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  const pending = await app.store.requestRegistration('investor@example.com', 'Password123!', 'Investor', { role: 'investor', rememberMe: false });
  assert.equal(app.store.getUser().id, 'demo-founder');
  const { user } = await app.store.verifyRegistration(pending.email, pending.demoCode);
  assert.equal(user.role, 'investor');
  assert.equal(app.store.getUser().id, user.id);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.session), null);
  assert.equal(JSON.parse(app.sessionStorage.getItem(AUTH_STORAGE_KEYS.session)).expiresAt, null);
  assert.equal(createMockAuthStore({ localStorage: app.localStorage, sessionStorage: memoryStorage(), crypto: webcrypto }).getUser(), null);
});

test('invalid signup details and existing accounts cannot create pending registrations', async () => {
  const app = fixture();
  for (const [email, password, name, role, message] of [
    ['bad-email', 'Password123!', 'A', 'founder', /valid email/],
    ['new@example.com', 'weak', 'A', 'founder', /between 9 and 20/],
    ['new@example.com', 'Password123!', ' ', 'founder', /full name/],
    ['new@example.com', 'Password123!', 'A', 'admin', /Choose Founder/],
    [DEMO_CREDENTIALS.email, 'Password123!', 'A', 'founder', /already exists/],
  ]) await assert.rejects(app.store.requestRegistration(email, password, name, { role }), message);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.registrations), null);
  await assert.rejects(app.store.resendRegistration('missing@example.com'), /No pending signup/);
  await assert.rejects(app.store.verifyRegistration('missing@example.com', '123456'), /No pending signup/);
});

test('pending signup codes belong to their email and malformed or wrong codes cannot create users', async () => {
  const app = fixture();
  const alice = await app.store.requestRegistration('alice@example.com', 'Password123!', 'Alice', { role: 'founder' });
  const bob = await app.store.requestRegistration('bob@example.com', 'Password123!', 'Bob', { role: 'investor' });
  const wrongCode = alice.demoCode === '000000' ? '000001' : '000000';
  for (const code of ['', '12345', '1234567', 'abcdef', 123456]) {
    await assert.rejects(app.store.verifyRegistration(alice.email, code), /six-digit/);
  }
  await assert.rejects(app.store.verifyRegistration(alice.email, wrongCode), /invalid or has already been used/);
  assert.equal(app.store.getUser(), null);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles), null);
  assert.equal((await app.store.verifyRegistration(alice.email, alice.demoCode)).user.full_name, 'Alice');
  assert.equal((await app.store.verifyRegistration(bob.email, bob.demoCode)).user.full_name, 'Bob');
});

test('signup codes preserve leading zeros', async () => {
  const crypto = {
    subtle: webcrypto.subtle,
    getRandomValues: (values) => values instanceof Uint32Array ? values.fill(42) : webcrypto.getRandomValues(values),
  };
  const { store } = fixture({ crypto });
  const pending = await store.requestRegistration('new@example.com', 'Password123!', 'New', { role: 'founder' });
  assert.equal(pending.demoCode, '000042');
  assert.equal((await store.verifyRegistration(pending.email, pending.demoCode)).user.email, pending.email);
});

test('signup codes expire at ten minutes and resend replaces them without losing profile details', async () => {
  let timestamp = Date.UTC(2026, 9, 20);
  const app = fixture({ now: () => timestamp });
  const first = await app.store.requestRegistration('new@example.com', 'Password123!', 'New Investor', { role: 'investor', rememberMe: false });
  assert.equal(first.expiresAt, timestamp + REGISTRATION_CODE_DURATION_MS);
  timestamp = first.expiresAt;
  await assert.rejects(app.refresh().verifyRegistration(first.email, first.demoCode), /has expired/);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles), null);
  const next = await app.refresh().resendRegistration(first.email);
  assert.notEqual(next.demoCode, first.demoCode);
  assert.equal(next.expiresAt, timestamp + REGISTRATION_CODE_DURATION_MS);
  await assert.rejects(app.store.verifyRegistration(first.email, first.demoCode), /invalid or has already been used/);
  timestamp = next.expiresAt - 1;
  const { user } = await app.store.verifyRegistration(next.email, next.demoCode);
  assert.equal(user.full_name, 'New Investor');
  assert.equal(user.role, 'investor');
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.session), null);
});

test('concurrent incorrect signup guesses exhaust five attempts and resend resets the limit', async () => {
  const app = fixture();
  const pending = await app.store.requestRegistration('new@example.com', 'Password123!', 'New', { role: 'founder' });
  const wrongCode = pending.demoCode === '000000' ? '000001' : '000000';
  const guesses = await Promise.allSettled(Array.from({ length: REGISTRATION_CODE_MAX_ATTEMPTS + 2 }, () =>
    app.refresh().verifyRegistration(pending.email, wrongCode)));
  assert.ok(guesses.every((guess) => guess.status === 'rejected'));
  const [saved] = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.registrations));
  assert.equal(saved.challenge.attempts, REGISTRATION_CODE_MAX_ATTEMPTS);
  await assert.rejects(app.store.verifyRegistration(pending.email, pending.demoCode), /Too many incorrect attempts/);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles), null);
  const resent = await app.store.resendRegistration(pending.email);
  assert.equal((await app.store.verifyRegistration(resent.email, resent.demoCode)).user.email, pending.email);
});

test('a slow signup request cannot overwrite a more recent request for the same email', async () => {
  const pause = pauseDigestOnce((text) => text.endsWith(':OriginalPass1!'));
  const { store } = fixture({ crypto: pause.crypto });
  const first = store.requestRegistration('new@example.com', 'OriginalPass1!', 'First', { role: 'founder' });
  await pause.started;
  const newer = await store.requestRegistration('new@example.com', 'ReplacementPass1!', 'Second', { role: 'investor' });
  const rejected = assert.rejects(first, /newer verification code/);
  pause.resume();
  await rejected;
  const { user } = await store.verifyRegistration(newer.email, newer.demoCode);
  assert.equal(user.full_name, 'Second');
  assert.equal(user.role, 'investor');
  store.logout();
  await assert.rejects(store.login(newer.email, 'OriginalPass1!'), /The email address or password is incorrect./);
  assert.equal((await store.login(newer.email, 'ReplacementPass1!')).user.id, user.id);
});

test('resending while signup verification is hashing prevents the old code from creating an account', async () => {
  let pausedCode = null;
  const pause = pauseDigestOnce((text) => pausedCode && text.endsWith(`:${pausedCode}`));
  const { store } = fixture({ crypto: pause.crypto });
  const first = await store.requestRegistration('new@example.com', 'Password123!', 'New', { role: 'founder' });
  pausedCode = first.demoCode;
  const verifying = store.verifyRegistration(first.email, first.demoCode);
  await pause.started;
  const newer = await store.resendRegistration(first.email);
  const rejected = assert.rejects(verifying, /invalid or has already been used/);
  pause.resume();
  await rejected;
  assert.equal(store.getUser(), null);
  assert.equal((await store.verifyRegistration(newer.email, newer.demoCode)).user.email, first.email);
});

test('expiry and attempt exhaustion during signup code hashing are rechecked', async () => {
  for (const cause of ['expiry', 'attempts']) {
    let timestamp = Date.UTC(2026, 9, 20);
    let pausedCode = null;
    const pause = pauseDigestOnce((text) => pausedCode && text.endsWith(`:${pausedCode}`));
    const app = fixture({ crypto: pause.crypto, now: () => timestamp });
    const pending = await app.store.requestRegistration('new@example.com', 'Password123!', 'New', { role: 'founder' });
    pausedCode = pending.demoCode;
    const verifying = app.store.verifyRegistration(pending.email, pending.demoCode);
    await pause.started;
    if (cause === 'expiry') timestamp = pending.expiresAt;
    else {
      const wrongCode = pending.demoCode === '000000' ? '000001' : '000000';
      await Promise.allSettled(Array.from({ length: REGISTRATION_CODE_MAX_ATTEMPTS }, () =>
        app.store.verifyRegistration(pending.email, wrongCode)));
    }
    const rejected = assert.rejects(verifying, cause === 'expiry' ? /has expired/ : /Too many incorrect attempts/);
    pause.resume();
    await rejected;
    assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles), null);
  }
});

test('concurrent correct signup verification creates exactly one account', async () => {
  const app = fixture();
  const pending = await app.store.requestRegistration('new@example.com', 'Password123!', 'New', { role: 'mentor' });
  const results = await Promise.allSettled([
    app.store.verifyRegistration(pending.email, pending.demoCode),
    app.refresh().verifyRegistration(pending.email, pending.demoCode),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  const accounts = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles));
  assert.equal(accounts.filter((account) => account.user.email === pending.email).length, 1);
});

test('corrupt pending signup data cannot create an account or session', async () => {
  const app = fixture();
  const pending = await app.store.requestRegistration('new@example.com', 'Password123!', 'New', { role: 'founder' });
  const saved = JSON.parse(app.localStorage.getItem(AUTH_STORAGE_KEYS.registrations));
  saved[0].password_verifier = 'not-a-digest';
  app.localStorage.setItem(AUTH_STORAGE_KEYS.registrations, JSON.stringify(saved));
  await assert.rejects(app.refresh().verifyRegistration(pending.email, pending.demoCode), /No pending signup/);
  assert.equal(app.store.getUser(), null);
  assert.equal(app.localStorage.getItem(AUTH_STORAGE_KEYS.profiles), null);
});

test('investor onboarding validates, trims, saves only its fields, and persists on sign in', async () => {
  const app = fixture();
  await app.store.register('investor@example.com', 'Password123!', 'Investor', { role: 'investor' });
  assert.throws(() => app.store.completeRoleOnboarding({ investmentFocus: ' ', preferredStage: 'Seed' }), /Investment focus is required/);
  assert.throws(() => app.store.completeRoleOnboarding({ investmentFocus: 'Health', preferredStage: '' }), /Preferred stage is required/);
  assert.throws(() => app.store.completeRoleOnboarding({ organization: 'x'.repeat(121), investmentFocus: 'Health', preferredStage: 'Seed' }), /120 characters/);
  assert.equal(app.store.getUser().onboarding_completed, false);
  const user = app.store.completeRoleOnboarding({ organization: ' Example Ventures ', investmentFocus: ' Climate tech ', preferredStage: ' Seed ', role: 'founder' });
  assert.equal(user.role, 'investor');
  assert.equal(user.onboarding_completed, true);
  assert.deepEqual(user.onboarding_profile, { organization: 'Example Ventures', investmentFocus: 'Climate tech', preferredStage: 'Seed' });
  app.store.logout();
  assert.deepEqual((await app.refresh().login(user.email, 'Password123!')).user.onboarding_profile, user.onboarding_profile);
});

test('mentor onboarding requires expertise, experience, and availability and stores the profile', async () => {
  const app = fixture();
  await app.store.register('mentor@example.com', 'Password123!', 'Mentor', { role: 'mentor' });
  const details = { expertise: 'Product design', experience: '5–10 years', availability: 'Two hours per month' };
  for (const key of Object.keys(details)) {
    assert.throws(() => app.store.completeRoleOnboarding({ ...details, [key]: '' }), /is required/);
  }
  assert.throws(() => app.store.completeRoleOnboarding({ ...details, experience: 'x'.repeat(81) }), /80 characters/);
  const user = app.store.completeRoleOnboarding(details);
  assert.equal(user.onboarding_completed, true);
  assert.deepEqual(app.refresh().getUser().onboarding_profile, details);
  assert.equal(user.assessment_completed, false);
});

test('role onboarding rejects signed-out, founder, and stale-account updates', async () => {
  const shared = memoryStorage();
  const tabA = fixture({ localStorage: shared });
  assert.throws(() => tabA.store.completeRoleOnboarding({}), /sign in/);
  await tabA.store.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  assert.throws(() => tabA.store.completeRoleOnboarding({}), /Investors and Mentors/);
  await tabA.store.register('investor@example.com', 'Password123!', 'Investor', { role: 'investor' });
  const tabB = fixture({ localStorage: shared });
  await tabB.store.register('mentor@example.com', 'Password123!', 'Mentor', { role: 'mentor' });
  assert.throws(() => tabA.store.completeRoleOnboarding({ investmentFocus: 'Health', preferredStage: 'Seed' }), /account changed/);
  assert.equal(tabB.store.getUser().onboarding_completed, false);
});
