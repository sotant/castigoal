const EMAIL_LOCAL_PART_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const EMAIL_DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9-]+$/;
const EMAIL_TOP_LEVEL_DOMAIN_PATTERN = /^[A-Za-z]{2,63}$/;

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;
const MAX_DOMAIN_LABEL_LENGTH = 63;

export function normalizeEmail(value: string) {
  return value.trim();
}

export function isValidEmail(value: string) {
  const normalized = normalizeEmail(value);

  if (!normalized || normalized.length > MAX_EMAIL_LENGTH || /\s/.test(normalized)) {
    return false;
  }

  const separatorIndex = normalized.indexOf('@');

  if (separatorIndex <= 0 || separatorIndex !== normalized.lastIndexOf('@')) {
    return false;
  }

  const localPart = normalized.slice(0, separatorIndex);
  const domain = normalized.slice(separatorIndex + 1);

  if (!localPart || !domain || localPart.length > MAX_LOCAL_PART_LENGTH || domain.length > MAX_DOMAIN_LENGTH) {
    return false;
  }

  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !EMAIL_LOCAL_PART_PATTERN.test(localPart)
  ) {
    return false;
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..') || !domain.includes('.')) {
    return false;
  }

  const labels = domain.split('.');

  if (
    labels.some(
      (label) =>
        !label ||
        label.length > MAX_DOMAIN_LABEL_LENGTH ||
        label.startsWith('-') ||
        label.endsWith('-') ||
        !EMAIL_DOMAIN_LABEL_PATTERN.test(label),
    )
  ) {
    return false;
  }

  const topLevelDomain = labels[labels.length - 1];
  return EMAIL_TOP_LEVEL_DOMAIN_PATTERN.test(topLevelDomain);
}

export function getEmailValidationError(value: string, options: { required?: boolean } = {}) {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return options.required ? 'Introduce un email válido' : null;
  }

  return isValidEmail(normalized) ? null : 'Introduce un email válido';
}
