/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional base URL for SolarScope backend API in production deployments
   * (e.g. "https://api.solarscope.app").
   *
   * If unset or empty, the frontend defaults to relative "/api" routing,
   * which integrates seamlessly with Vite dev proxy and single-domain reverse proxies.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
