/** Postgres unique_violation (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; constraint?: unknown; cause?: unknown };
  if (candidate.code === '23505') {
    if (!constraint) return true;
    return candidate.constraint === constraint;
  }
  return isUniqueViolation(candidate.cause, constraint);
}

const USERS_EMAIL_UNIQUE = 'users_email_unique';

/** True when the failure is a race on users.email (constraint name or Key (email)= detail). */
export function isEmailUniqueViolation(error: unknown): boolean {
  if (isUniqueViolation(error, USERS_EMAIL_UNIQUE)) return true;
  if (!isUniqueViolation(error)) return false;
  const detail =
    error && typeof error === 'object' && 'detail' in error
      ? String((error as { detail: unknown }).detail)
      : '';
  return /\(email\)=/i.test(detail);
}
