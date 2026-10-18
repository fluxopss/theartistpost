/**
 * Profile and upload limits shared by the API (zod schemas) and the website's
 * forms. One source so the browser never promises what the server refuses.
 */
export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const BIO_MAX = 480;
export const HEADLINE_MAX = 80;
export const LOCATION_MAX = 60;
export const TOPICS_MAX = 8;
export const IMAGE_MAX_BYTES = 2.5 * 1024 * 1024;
