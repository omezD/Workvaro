import { environment } from '../../../environments/environment';

type ParamValue = string | number | boolean | null | undefined;

/** `api('/employees', { search: 'esha', dept: null })` -> "/api/employees?search=esha". Empty params are dropped. */
export function api(path: string, params?: Record<string, ParamValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return `${environment.apiBaseUrl}${path}${qs ? '?' + qs : ''}`;
}
