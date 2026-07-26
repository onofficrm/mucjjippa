declare module '@sentry/node' {
  export function init(options: {
    dsn: string;
    environment?: string;
    tracesSampleRate?: number;
  }): void;
  export function captureException(error: unknown): void;
}
