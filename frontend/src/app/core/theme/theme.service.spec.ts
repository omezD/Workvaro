import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('restores the saved choice', () => {
    localStorage.setItem('wv-theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('dark');
  });

  it('remembers a new choice and applies it to <html>', () => {
    const service = TestBed.inject(ThemeService);
    service.set('dark');
    TestBed.tick();
    expect(localStorage.getItem('wv-theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    service.toggle();
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
