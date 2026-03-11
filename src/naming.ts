import { NamingStyle } from './types';

function splitWords(value: string): string[] {
  return value
    .replace(/[\[\]`"]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
}

export function normalizeIdentifier(value: string): string {
  return value.replace(/^[\[\]`"]+|[\[\]`"]+$/g, '').trim();
}

export function applyNamingStyle(value: string, style: NamingStyle): string {
  const normalized = normalizeIdentifier(value);
  if (style === 'original') {
    return normalized;
  }

  const words = splitWords(normalized);
  if (words.length === 0) {
    return normalized;
  }

  switch (style) {
    case 'pascal':
      return words.map(capitalize).join('');
    case 'camel':
      return words[0] + words.slice(1).map(capitalize).join('');
    case 'snake':
      return words.join('_');
    default:
      return normalized;
  }
}

export function toSafeIdentifier(value: string, style: NamingStyle): string {
  const styled = applyNamingStyle(value, style);
  const compact = styled.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!compact) {
    return 'field';
  }

  return /^\d/.test(compact) ? `_${compact}` : compact;
}
