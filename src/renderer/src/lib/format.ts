export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

export function formatZoom(f: number): string {
  return `${Math.round(f * 100)} %`;
}

export type StatusTone = 'info' | 'success' | 'accent' | 'warning' | 'danger';

/** Doc 05: 1xx info, 2xx success, 3xx accent, 4xx warning, 5xx danger. */
export function statusTone(status: number): StatusTone {
  if (status < 200) return 'info';
  if (status < 300) return 'success';
  if (status < 400) return 'accent';
  if (status < 500) return 'warning';
  return 'danger';
}
