import {
  createSafeStorage,
  localStore,
  sessionStore,
} from '../../../services/storage/local_storage.js';
import { validatePassword } from '../validation/auth_validation.js';
import { ILLUSTRATIVE_PLACEMENT } from '../../assessment/services/mock_assessment.js';

// These are public demo credentials. This frontend does not provide real authentication.
export const DEMO_CREDENTIALS = Object.freeze({
  email: 'founder@labx.demo',
  password: 'Demo1234!',
});

export const AUTH_STORAGE_KEYS = Object.freeze({
  profiles: 'labx.demo.profiles.v1',
  session: 'labx.demo.session.v1',
  registrations: 'labx.demo.registrations.v1',
});

export const REMEMBER_ME_DURATION_MS = 10 * 24 * 60 * 60 * 1000;
export const RESET_CODE_DURATION_MS = 10 * 60 * 1000;
export const RESET_CODE_MAX_ATTEMPTS = 5;
export const REGISTRATION_CODE_DURATION_MS = 10 * 60 * 1000;
export const REGISTRATION_CODE_MAX_ATTEMPTS = 5;
const DUPLICATE_EMAIL_MESSAGE = 'An account with this email address already exists. Please sign in.';
const INVALID_CREDENTIALS_MESSAGE = 'The email address or password is incorrect.';
const INVALID_RESET_MESSAGE = 'This verification code is invalid or has already been used. Request a new code.';
const INVALID_EMAIL_MESSAGE = 'This email is invalid.';
const EXPIRED_RESET_MESSAGE = 'This verification code has expired. Request a new code.';
const RESET_ATTEMPTS_MESSAGE = 'Too many incorrect attempts. Request a new code.';

const DEMO_ACCOUNT = {
  user: {
    id: 'demo-founder',
    email: DEMO_CREDENTIALS.email,
    full_name: 'Demo Founder',
    username: 'founder',
    role: 'founder',
    avatar_url: '',
    total_points: 0,
    assessment_completed: false,
    assessment_skipped: false,
    assessment_result: null,
    assessment_answers: null,
  },
  password_salt: 'labx-demo-founder-v1',
  password_verifier: '24cadebcc8ad643b32da9e529a988e40944d9815c970fab7285688faed99a84f',
  auth_version: 0,
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function normalizeAssessmentResult(result) {
  if (result?.isMock === true && (result.version ?? 1) < 3) {
    // Upgrade saved demos to the illustrative card placement approved for this flow.
    return {
      domain: result.domain,
      guild: result.guild,
      ...ILLUSTRATIVE_PLACEMENT,
      placement_status: 'mock',
      isMock: true,
      version: 3,
    };
  }
  return result;
}

function isAccount(account) {
  return isObject(account) && isObject(account.user)
    && typeof account.user.id === 'string'
    && isEmail(account.user.email)
    && typeof account.user.full_name === 'string'
    && ['founder', 'mentor', 'investor'].includes(account.user.role)
    && typeof account.password_salt === 'string'
    && /^[a-f0-9]{64}$/.test(account.password_verifier);
}

// Injectable storage keeps this mock independent of React and testable without a browser.
export function createMockAuthStore({
  localStorage = localStore,
  sessionStorage = sessionStore,
  crypto = globalThis.crypto,
  now = Date.now,
} = {}) {
  const local = localStorage?.readJSON ? localStorage : createSafeStorage(localStorage);
  const session = sessionStorage?.readJSON ? sessionStorage : createSafeStorage(sessionStorage);

  function readAccounts() {
    const saved = local.readJSON(AUTH_STORAGE_KEYS.profiles, []);
    const accounts = new Map([[DEMO_CREDENTIALS.email, clone(DEMO_ACCOUNT)]]);
    if (Array.isArray(saved)) {
      saved.filter(isAccount).forEach((account) => {
        const email = normalizeEmail(account.user.email);
        const completed = account.user.assessment_completed === true
          && isObject(account.user.assessment_result) && isObject(account.user.assessment_answers);
        accounts.set(email, {
          ...account,
          user: {
            ...account.user,
            email,
            assessment_completed: completed,
            assessment_skipped: account.user.role === 'founder' && !completed && account.user.assessment_skipped === true,
            assessment_result: completed ? normalizeAssessmentResult(account.user.assessment_result) : null,
            assessment_answers: completed ? account.user.assessment_answers : null,
          },
        });
      });
    }
    return accounts;
  }

  function writeAccounts(accounts) {
    local.writeJSON(AUTH_STORAGE_KEYS.profiles, [...accounts.values()]);
  }

  function readRegistrations() {
    const saved = local.readJSON(AUTH_STORAGE_KEYS.registrations, []);
    return new Map((Array.isArray(saved) ? saved : []).filter((pending) =>
      isObject(pending) && isEmail(pending.email) && typeof pending.full_name === 'string'
      && pending.full_name.trim() && ['founder', 'mentor', 'investor'].includes(pending.role)
      && typeof pending.password_salt === 'string'
      && (pending.password_verifier === null || /^[a-f0-9]{64}$/.test(pending.password_verifier))
      && typeof pending.remember_me === 'boolean' && isObject(pending.challenge)
      && typeof pending.challenge.id === 'string').map((pending) => [pending.email, pending]));
  }

  function writeRegistrations(registrations) {
    local.writeJSON(AUTH_STORAGE_KEYS.registrations, [...registrations.values()]);
  }

  function clearRegistration(email) {
    const registrations = readRegistrations();
    if (registrations.delete(email)) writeRegistrations(registrations);
  }

  function registrationDetails(emailInput, password, nameInput, role) {
    const email = normalizeEmail(emailInput);
    const fullName = String(nameInput ?? '').trim();
    if (!fullName) throw new Error('Enter your full name.');
    if (!isEmail(email)) throw new Error('Enter a valid email address.');
    if (!['founder', 'mentor', 'investor'].includes(role)) throw new Error('Choose Founder, Mentor, or Investor as your role.');
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    if (readAccounts().has(email)) throw new Error(DUPLICATE_EMAIL_MESSAGE);
    return { email, fullName, role };
  }

  function newUser(email, fullName, role) {
    const usernames = new Set([...readAccounts().values()].map((account) => String(account.user.username ?? '').toLowerCase()));
    usernames.add('founder');
    let base = email.split('@')[0].replace(/[^a-z0-9_]/g, '_').slice(0, 24);
    if (base.length < 3) base = `${base}_user`;
    let username = base;
    let suffix = 2;
    while (usernames.has(username)) username = `${base}_${suffix++}`;
    return {
      id: `${role}-${randomId()}`,
      email,
      full_name: fullName,
      username,
      role,
      avatar_url: '',
      total_points: 0,
      assessment_completed: false,
      assessment_skipped: false,
      assessment_result: null,
      assessment_answers: null,
      onboarding_completed: false,
      onboarding_profile: null,
    };
  }

  function readSession() {
    const accounts = readAccounts();
    for (const [storage, rememberMe] of [[session, false], [local, true]]) {
      const saved = storage.readJSON(AUTH_STORAGE_KEYS.session);
      if (!saved) continue;
      const account = [...accounts.values()].find((entry) => entry.user.id === saved.userId);
      const validExpiry = !rememberMe || (Number.isFinite(saved.expiresAt) && saved.expiresAt > now());
      if (saved.version === 1 && account && validExpiry && saved.authVersion === (account.auth_version ?? 0)) {
        return { account, rememberMe, expiresAt: rememberMe ? saved.expiresAt : null };
      }
      storage.removeItem(AUTH_STORAGE_KEYS.session);
    }
    return null;
  }

  function saveSession(account, rememberMe) {
    local.removeItem(AUTH_STORAGE_KEYS.session);
    session.removeItem(AUTH_STORAGE_KEYS.session);
    (rememberMe ? local : session).writeJSON(AUTH_STORAGE_KEYS.session, {
      version: 1,
      userId: account.user.id,
      authVersion: account.auth_version ?? 0,
      expiresAt: rememberMe ? now() + REMEMBER_ME_DURATION_MS : null,
    });
  }

  async function passwordVerifier(password, salt) {
    if (!crypto?.subtle) {
      throw new Error('This demo needs a modern browser on localhost or HTTPS to create and check accounts.');
    }
    // Salted digests avoid saving plaintext passwords. They are demo data, not server credentials.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function randomId() {
    if (!crypto?.getRandomValues) throw new Error('Secure browser randomness is unavailable.');
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function randomVerificationCode() {
    if (!crypto?.getRandomValues) throw new Error('Secure browser randomness is unavailable.');
    const values = new Uint32Array(1);
    // Reject the incomplete range instead of biasing a six-digit value with modulo.
    const limit = Math.floor(0x100000000 / 1000000) * 1000000;
    do {
      crypto.getRandomValues(values);
    } while (values[0] >= limit);
    return String(values[0] % 1000000).padStart(6, '0');
  }

  function verificationChallenge(challenge, expectedId, maxAttempts = RESET_CODE_MAX_ATTEMPTS) {
    if (!isObject(challenge) || typeof challenge.id !== 'string'
      || !/^[a-f0-9]{64}$/.test(challenge.verifier)
      || !Number.isFinite(challenge.expires_at)
      || !Number.isInteger(challenge.attempts) || challenge.attempts < 0
      || (expectedId !== undefined && challenge.id !== expectedId)) {
      throw new Error(INVALID_RESET_MESSAGE);
    }
    if (challenge.expires_at <= now()) throw new Error(EXPIRED_RESET_MESSAGE);
    if (challenge.attempts >= maxAttempts) throw new Error(RESET_ATTEMPTS_MESSAGE);
    return challenge;
  }

  async function createVerificationCode(id, previous) {
    let demoCode;
    do {
      demoCode = randomVerificationCode();
    } while (previous?.verifier && await passwordVerifier(demoCode, previous.id) === previous.verifier);
    return { demoCode, verifier: await passwordVerifier(demoCode, id) };
  }

  function pendingRegistration(email, expectedId) {
    const pending = readRegistrations().get(email);
    if (!pending || !/^[a-f0-9]{64}$/.test(pending.password_verifier)) {
      throw new Error('No pending signup was found. Please sign up again.');
    }
    if (expectedId !== undefined && pending.challenge.id !== expectedId) throw new Error(INVALID_RESET_MESSAGE);
    return pending;
  }

  // Remember which account this instance presented, even if another tab changes
  // the shared remembered session before its storage event reaches the UI.
  let activeUserId = readSession()?.account.user.id ?? null;

  function currentFounder(expectedUserId) {
    const current = readSession();
    if (!current) throw new Error('Please sign in before continuing your assessment.');
    if (current.account.user.id !== expectedUserId) {
      throw new Error('Your signed-in account changed in another tab. Please reopen the assessment before saving.');
    }
    if (current.account.user.role !== 'founder') throw new Error('This assessment is for Founders.');
    if (current.account.user.assessment_completed) throw new Error('Your assessment is complete. Completed answers cannot be changed.');
    return current;
  }

  return {
    getUser() {
      const current = readSession();
      activeUserId = current?.account.user.id ?? null;
      return current ? clone(current.account.user) : null;
    },

    getSessionExpiresAt() {
      return readSession()?.expiresAt ?? null;
    },

    updateProfileIdentity(details, expectedUserId = activeUserId) {
      const current = readSession();
      if (!current || !expectedUserId || current.account.user.id !== expectedUserId) {
        throw new Error('Your signed-in account changed. Reopen your profile before saving.');
      }
      const fullName = typeof details?.full_name === 'string' ? details.full_name.trim() : '';
      const username = typeof details?.username === 'string' ? details.username.trim().toLowerCase() : '';
      if (!fullName || fullName.length > 80) throw new Error('Enter a display name between 1 and 80 characters.');
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        throw new Error('Use 3–30 letters, numbers or underscores for your username.');
      }
      const accounts = readAccounts();
      const taken = [...accounts.values()].some((account) => account.user.id !== expectedUserId
        && String(account.user.username ?? '').toLowerCase() === username);
      if (taken || (username === 'founder' && expectedUserId !== DEMO_ACCOUNT.user.id)) {
        throw new Error('This username is already taken. Choose another.');
      }
      const account = accounts.get(current.account.user.email);
      const updated = { ...account, user: { ...account.user, full_name: fullName, username } };
      accounts.set(updated.user.email, updated);
      writeAccounts(accounts);
      return clone(updated.user);
    },

    findRegisteredFounderByEmail(emailInput, expectedUserId = activeUserId) {
      const current = readSession()?.account.user;
      if (!current || current.id !== expectedUserId || current.role !== 'founder') {
        throw new Error('Your signed-in account changed. Sign in as a Founder to invite someone.');
      }
      const account = readAccounts().get(normalizeEmail(emailInput));
      if (!account || account.user.role !== 'founder') return null;
      const { id, email, full_name, role } = account.user;
      return { id, email, full_name, role };
    },

    async register(emailInput, password, nameInput, { role, rememberMe = true } = {}) {
      const { email, fullName } = registrationDetails(emailInput, password, nameInput, role);

      const salt = randomId();
      const verifier = await passwordVerifier(password, salt);
      // Check again after hashing so two simultaneous submissions cannot create duplicates.
      const accounts = readAccounts();
      if (accounts.has(email)) throw new Error(DUPLICATE_EMAIL_MESSAGE);
      const user = newUser(email, fullName, role);
      const account = { user, password_salt: salt, password_verifier: verifier, auth_version: 0 };
      accounts.set(email, account);
      writeAccounts(accounts);
      clearRegistration(email);
      saveSession(account, Boolean(rememberMe));
      activeUserId = user.id;
      return { user: clone(user) };
    },

    async requestRegistration(emailInput, password, nameInput, { role, rememberMe = true } = {}) {
      const { email, fullName } = registrationDetails(emailInput, password, nameInput, role);
      const registrations = readRegistrations();
      const previous = registrations.get(email)?.challenge;
      const id = randomId();
      const salt = randomId();
      const expiresAt = now() + REGISTRATION_CODE_DURATION_MS;
      const challenge = { id, verifier: null, expires_at: expiresAt, attempts: 0 };
      // Only salted digests enter storage; this reservation is not an account.
      registrations.set(email, {
        email, full_name: fullName, role, remember_me: Boolean(rememberMe),
        password_salt: salt, password_verifier: null, challenge,
      });
      writeRegistrations(registrations);
      const [verifier, code] = await Promise.all([
        passwordVerifier(password, salt),
        createVerificationCode(id, previous),
      ]);
      if (readAccounts().has(email)) {
        clearRegistration(email);
        throw new Error(DUPLICATE_EMAIL_MESSAGE);
      }
      const latestRegistrations = readRegistrations();
      const latest = latestRegistrations.get(email);
      if (!latest || latest.challenge.id !== id) throw new Error('A newer verification code was requested. Use the latest code.');
      latestRegistrations.set(email, { ...latest, password_verifier: verifier, challenge: { ...challenge, verifier: code.verifier } });
      writeRegistrations(latestRegistrations);
      return { email, demoCode: code.demoCode, expiresAt };
    },

    async resendRegistration(emailInput) {
      const email = normalizeEmail(emailInput);
      if (!isEmail(email)) throw new Error('Enter a valid email address.');
      if (readAccounts().has(email)) throw new Error(DUPLICATE_EMAIL_MESSAGE);
      const pending = pendingRegistration(email);
      const id = randomId();
      const expiresAt = now() + REGISTRATION_CODE_DURATION_MS;
      const challenge = { id, verifier: null, expires_at: expiresAt, attempts: 0 };
      const registrations = readRegistrations();
      registrations.set(email, { ...pending, challenge });
      writeRegistrations(registrations);
      const { demoCode, verifier } = await createVerificationCode(id, pending.challenge);
      if (readAccounts().has(email)) {
        clearRegistration(email);
        throw new Error(DUPLICATE_EMAIL_MESSAGE);
      }
      const latestRegistrations = readRegistrations();
      const latest = latestRegistrations.get(email);
      if (!latest || latest.challenge.id !== id) throw new Error('A newer verification code was requested. Use the latest code.');
      latestRegistrations.set(email, { ...latest, challenge: { ...challenge, verifier } });
      writeRegistrations(latestRegistrations);
      return { email, demoCode, expiresAt };
    },

    async verifyRegistration(emailInput, code) {
      const email = normalizeEmail(emailInput);
      if (!isEmail(email)) throw new Error('Enter a valid email address.');
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new Error('Enter the six-digit verification code.');
      const pending = pendingRegistration(email);
      const challenge = verificationChallenge(pending.challenge, undefined, REGISTRATION_CODE_MAX_ATTEMPTS);
      const verifier = await passwordVerifier(code, challenge.id);
      const latest = pendingRegistration(email, challenge.id);
      const latestChallenge = verificationChallenge(latest.challenge, challenge.id, REGISTRATION_CODE_MAX_ATTEMPTS);
      if (verifier !== latestChallenge.verifier) {
        const attempts = latestChallenge.attempts + 1;
        const registrations = readRegistrations();
        registrations.set(email, { ...latest, challenge: { ...latestChallenge, attempts } });
        writeRegistrations(registrations);
        throw new Error(attempts >= REGISTRATION_CODE_MAX_ATTEMPTS ? RESET_ATTEMPTS_MESSAGE : INVALID_RESET_MESSAGE);
      }
      const accounts = readAccounts();
      if (accounts.has(email)) {
        clearRegistration(email);
        throw new Error(DUPLICATE_EMAIL_MESSAGE);
      }
      const user = {
        ...newUser(email, latest.full_name, latest.role),
        email_verified: true,
        email_verified_at: new Date(now()).toISOString(),
      };
      const account = { user, password_salt: latest.password_salt, password_verifier: latest.password_verifier, auth_version: 0 };
      // No async work follows the last challenge check; concurrent submissions
      // cannot both create this account or consume the same pending signup.
      accounts.set(email, account);
      writeAccounts(accounts);
      clearRegistration(email);
      saveSession(account, latest.remember_me);
      activeUserId = user.id;
      return { user: clone(user) };
    },

    async login(emailInput, password, { rememberMe = true } = {}) {
      const email = normalizeEmail(emailInput);
      if (!isEmail(email) || typeof password !== 'string' || !password) throw new Error(INVALID_CREDENTIALS_MESSAGE);
      const account = readAccounts().get(email);
      if (!account || await passwordVerifier(password, account.password_salt) !== account.password_verifier) {
        throw new Error(INVALID_CREDENTIALS_MESSAGE);
      }
      // A reset in another tab while hashing must not revive old credentials.
      const latest = readAccounts().get(email);
      if (!latest || latest.password_verifier !== account.password_verifier) throw new Error(INVALID_CREDENTIALS_MESSAGE);
      saveSession(latest, Boolean(rememberMe));
      activeUserId = account.user.id;
      return { user: clone(latest.user) };
    },

    logout() {
      local.removeItem(AUTH_STORAGE_KEYS.session);
      session.removeItem(AUTH_STORAGE_KEYS.session);
      activeUserId = null;
    },

    completeRoleOnboarding(details, expectedUserId = activeUserId) {
      const current = readSession();
      if (!current) throw new Error('Please sign in before completing your profile.');
      if (current.account.user.id !== expectedUserId) throw new Error('Your signed-in account changed in another tab. Reopen your profile before saving.');
      const role = current.account.user.role;
      if (!['investor', 'mentor'].includes(role)) throw new Error('This profile setup is for Investors and Mentors.');
      if (!isObject(details)) throw new Error('Complete your profile details.');
      const fields = role === 'investor'
        ? [['organization', 'Organization', 120, false], ['investmentFocus', 'Investment focus', 120, true], ['preferredStage', 'Preferred stage', 80, true]]
        : [['expertise', 'Expertise', 120, true], ['experience', 'Experience', 80, true], ['availability', 'Availability', 80, true]];
      const profile = {};
      for (const [key, label, maxLength, required] of fields) {
        const value = typeof details[key] === 'string' ? details[key].trim() : '';
        if (required && !value) throw new Error(`${label} is required.`);
        if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
        profile[key] = value;
      }
      const user = {
        ...current.account.user,
        onboarding_completed: true,
        onboarding_profile: profile,
        onboarding_completed_at: new Date(now()).toISOString(),
      };
      const accounts = readAccounts();
      accounts.set(user.email, { ...current.account, user });
      writeAccounts(accounts);
      return clone(user);
    },

    completeAssessment(result, answers, expectedUserId = activeUserId) {
      const current = currentFounder(expectedUserId);
      if (!isObject(result) || !isObject(answers)) throw new Error('Complete the assessment before saving your results.');
      const user = {
        ...current.account.user,
        assessment_completed: true,
        assessment_skipped: false,
        assessment_result: clone(result),
        assessment_answers: clone(answers),
        assessment_completed_at: new Date(now()).toISOString(),
      };
      const accounts = readAccounts();
      accounts.set(user.email, { ...current.account, user });
      writeAccounts(accounts);
      return clone(user);
    },

    skipAssessment(expectedUserId = activeUserId) {
      const current = currentFounder(expectedUserId);
      const user = { ...current.account.user, assessment_skipped: true };
      const accounts = readAccounts();
      accounts.set(user.email, { ...current.account, user });
      writeAccounts(accounts);
      return clone(user);
    },

    async requestPasswordReset(emailInput) {
      const email = normalizeEmail(emailInput);
      if (!isEmail(email)) throw new Error(INVALID_EMAIL_MESSAGE);
      const accounts = readAccounts();
      const account = accounts.get(email);
      if (!account) throw new Error(INVALID_EMAIL_MESSAGE);
      const previous = account.reset_challenge;
      const id = randomId();
      const expiresAt = now() + RESET_CODE_DURATION_MS;
      const pending = { ...account, reset_challenge: { id, verifier: null, expires_at: expiresAt, attempts: 0 } };
      delete pending.reset_token;
      // Reserve this challenge before hashing so a newer request immediately
      // invalidates the previous code, including requests still being prepared.
      accounts.set(email, pending);
      writeAccounts(accounts);
      const { demoCode, verifier } = await createVerificationCode(id, previous);
      const latestAccounts = readAccounts();
      const latest = latestAccounts.get(email);
      if (!latest || latest.reset_challenge?.id !== id) throw new Error('A newer verification code was requested. Use the latest code.');
      latestAccounts.set(email, { ...latest, reset_challenge: { id, verifier, expires_at: expiresAt, attempts: 0 } });
      writeAccounts(latestAccounts);
      // This browser-local demo displays the code; no email is sent.
      return { email, demoCode, expiresAt };
    },

    async resetPassword(emailInput, code, password) {
      const email = normalizeEmail(emailInput);
      const account = readAccounts().get(email);
      if (!isEmail(email) || !account) throw new Error(INVALID_EMAIL_MESSAGE);
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new Error('Enter the six-digit verification code.');
      const challenge = verificationChallenge(account.reset_challenge);
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      const codeVerifier = await passwordVerifier(code, challenge.id);
      const checkedAccounts = readAccounts();
      const checkedAccount = checkedAccounts.get(email);
      const checkedChallenge = verificationChallenge(checkedAccount?.reset_challenge, challenge.id);
      if (codeVerifier !== checkedChallenge.verifier) {
        const attempts = checkedChallenge.attempts + 1;
        checkedAccounts.set(email, { ...checkedAccount, reset_challenge: { ...checkedChallenge, attempts } });
        writeAccounts(checkedAccounts);
        throw new Error(attempts >= RESET_CODE_MAX_ATTEMPTS ? RESET_ATTEMPTS_MESSAGE : INVALID_RESET_MESSAGE);
      }
      const salt = randomId();
      const verifier = await passwordVerifier(password, salt);
      const accounts = readAccounts();
      const latest = accounts.get(email);
      // Resends, expiry, attempt exhaustion, or a concurrent successful reset
      // must not be undone by this password hash completing later.
      const latestChallenge = verificationChallenge(latest?.reset_challenge, challenge.id);
      if (latestChallenge.verifier !== codeVerifier) throw new Error(INVALID_RESET_MESSAGE);
      const updated = {
        ...latest,
        password_salt: salt,
        password_verifier: verifier,
        auth_version: (latest.auth_version ?? 0) + 1,
      };
      delete updated.reset_challenge;
      delete updated.reset_token;
      accounts.set(email, updated);
      writeAccounts(accounts);
      // Versioning also invalidates this account's sessions in other tabs.
      for (const storage of [local, session]) {
        if (storage.readJSON(AUTH_STORAGE_KEYS.session)?.userId === account.user.id) {
          storage.removeItem(AUTH_STORAGE_KEYS.session);
        }
      }
      if (activeUserId === account.user.id) activeUserId = null;
      return { email: account.user.email };
    },
  };
}

export const mockAuth = createMockAuthStore();
