const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Normalizes username for storage/API (trim + lowercase).
 * Pure function - no side effects.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Validates login/register form fields.
 * Returns null if valid, error message string otherwise.
 * Pure function - no side effects, no React.
 */
export function validateLoginForm(
  username: string,
  password: string
): string | null {
  const trimmed = username.trim();

  if (!trimmed || !password) {
    return 'Username and password are required';
  }

  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return 'Username must be at least 3 characters';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Password must be at least 6 characters';
  }

  return null;
}
