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
});

export const REMEMBER_ME_DURATION_MS = 10 * 24 * 60 * 60 * 1000;
const DUPLICATE_EMAIL_MESSAGE = 'This email is already registered. Please log in.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const INVALID_RESET_MESSAGE = 'This reset link is invalid or has already been used. Request a new link.';

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
    && ['founder', 'mentor'].includes(account.user.role)
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

  // Remember which account this instance presented, even if another tab changes
  // the shared remembered session before its storage event reaches the UI.
  let activeUserId = readSession()?.account.user.id ?? null;

  function currentFounder(expectedUserId) {
    const current = readSession();
    if (!current) throw new Error('Please log in before continuing your assessment.');
    if (current.account.user.id !== expectedUserId) {
      throw new Error('Your signed-in account changed in another tab. Please reopen the assessment before saving.');
    }
    if (current.account.user.role !== 'founder') throw new Error('This assessment is for Founders. Mentors have a separate onboarding flow.');
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

    async register(emailInput, password, nameInput, { role, rememberMe = true } = {}) {
      const email = normalizeEmail(emailInput);
      const fullName = String(nameInput ?? '').trim();
      if (!fullName) throw new Error('Enter your full name.');
      if (!isEmail(email)) throw new Error('Enter a valid email address.');
      if (!['founder', 'mentor'].includes(role)) throw new Error('Choose Founder or Mentor as your role.');
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      if (readAccounts().has(email)) throw new Error(DUPLICATE_EMAIL_MESSAGE);

      const salt = randomId();
      const verifier = await passwordVerifier(password, salt);
      // Check again after hashing so two simultaneous submissions cannot create duplicates.
      const accounts = readAccounts();
      if (accounts.has(email)) throw new Error(DUPLICATE_EMAIL_MESSAGE);
      const user = {
        id: `${role}-${randomId()}`,
        email,
        full_name: fullName,
        username: email.split('@')[0],
        role,
        avatar_url: '',
        total_points: 0,
        assessment_completed: false,
        assessment_skipped: false,
        assessment_result: null,
        assessment_answers: null,
      };
      const account = { user, password_salt: salt, password_verifier: verifier, auth_version: 0 };
      accounts.set(email, account);
      writeAccounts(accounts);
      saveSession(account, Boolean(rememberMe));
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
      if (!isEmail(email)) throw new Error('Enter a valid email address.');
      const accounts = readAccounts();
      const account = accounts.get(email);
      if (!account) return { email };
      const resetToken = randomId();
      // This local demo returns a link token instead of sending email. Requesting
      // another link replaces it; expiry is intentionally unspecified in the PDF.
      accounts.set(email, { ...account, reset_token: resetToken });
      writeAccounts(accounts);
      return { email, resetToken };
    },

    async resetPassword(token, password) {
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      if (typeof token !== 'string' || !token) throw new Error(INVALID_RESET_MESSAGE);
      const account = [...readAccounts().values()].find((entry) => entry.reset_token === token);
      if (!account) throw new Error(INVALID_RESET_MESSAGE);
      const salt = randomId();
      const verifier = await passwordVerifier(password, salt);
      const accounts = readAccounts();
      const latest = accounts.get(account.user.email);
      if (!latest || latest.reset_token !== token) throw new Error(INVALID_RESET_MESSAGE);
      const updated = {
        ...latest,
        password_salt: salt,
        password_verifier: verifier,
        auth_version: (latest.auth_version ?? 0) + 1,
      };
      delete updated.reset_token;
      accounts.set(account.user.email, updated);
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
