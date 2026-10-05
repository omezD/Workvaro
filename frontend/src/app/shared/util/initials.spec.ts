import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';
import { isRole } from '../../core/auth/roles';

describe('initialsOf', () => {
  it('uses first and last name', () => {
    expect(initialsOf('Esha Patel')).toBe('EP');
    expect(initialsOf('Manoj Kumar Singh')).toBe('MS');
  });

  it('falls back to the first two letters of a single name', () => {
    expect(initialsOf('admin')).toBe('AD');
  });

  it('handles empty input', () => {
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('isRole', () => {
  it('accepts only the realm roles the backend uses', () => {
    expect(isRole('HR')).toBe(true);
    expect(isRole('offline_access')).toBe(false);
    expect(isRole('default-roles-ems')).toBe(false);
  });
});
