const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => EMAIL_REGEX.test(normalizeEmail(email));

export function addEmailsToList(currentEmails: string[], rawInput: string) {
  const emails = [...currentEmails];
  const seen = new Set(currentEmails.map(normalizeEmail));
  const invalidEmails: string[] = [];
  const duplicateEmails: string[] = [];

  const candidates = rawInput
    .split(/[\s,;\n]+/g)
    .map(normalizeEmail)
    .filter(Boolean);

  for (const email of candidates) {
    if (!isValidEmail(email)) {
      invalidEmails.push(email);
      continue;
    }

    if (seen.has(email)) {
      duplicateEmails.push(email);
      continue;
    }

    seen.add(email);
    emails.push(email);
  }

  return {
    emails,
    invalidEmails: [...new Set(invalidEmails)],
    duplicateEmails: [...new Set(duplicateEmails)],
  };
}
