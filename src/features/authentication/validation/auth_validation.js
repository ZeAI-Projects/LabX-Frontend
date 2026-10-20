export function validatePassword(password) {
  if (typeof password !== 'string' || !password) return 'Password is required.';
  if (password.length < 9 || password.length > 20) {
    return 'Password must be between 9 and 20 characters.';
  }
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Include at least one number.';
  if (!/[^A-Za-z0-9\s]/.test(password)) return 'Include at least one special character.';
  return '';
}
