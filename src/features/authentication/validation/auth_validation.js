export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 9 || password.length > 20) {
    return 'Use a password with 9–20 characters.';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
    return 'Include an uppercase letter, a lowercase letter, a number, and a special character.';
  }
  return '';
}
