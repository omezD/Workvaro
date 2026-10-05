import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'wv-theme';

/**
 * Light/dark switch. The first choice follows the operating system; after the user picks one it is
 * remembered on this device. index.html applies the stored value before Angular starts (no flash).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(this.initialMode());

  constructor() {
    effect(() => {
      this.doc.documentElement.dataset['theme'] = this.mode();
    });
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // storage unavailable (private mode): the choice simply isn't remembered
    }
  }

  toggle(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private initialMode(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // ignore
    }
    const media = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    return media?.matches ? 'dark' : 'light';
  }
}
