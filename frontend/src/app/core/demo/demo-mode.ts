import { HttpInterceptorFn } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, EnvironmentProviders, Provider } from '@angular/core';

// Normal builds: demo mode is off and nothing from the demo backend is bundled.
// `npm run demo` swaps this file for demo-mode.demo.ts (see the "demo" configuration in angular.json).

export const DEMO_MODE = false;

export function demoProviders(): (Provider | EnvironmentProviders)[] {
  return [];
}

export const demoInterceptors: HttpInterceptorFn[] = [];

@Component({
  selector: 'wv-demo-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class DemoBar {}
