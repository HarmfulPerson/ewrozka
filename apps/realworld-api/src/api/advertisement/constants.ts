/** Cena: min 2000 (20 zł), max 99999999 groszy (999999.99 zł) */
export const PRICE_GROSZE_MIN = 2000;
export const PRICE_GROSZE_MAX = 99_999_999;

/** Czas trwania: min 1 minuta, max 7 dni (10080 min) */
export const DURATION_MINUTES_MIN = 1;
export const DURATION_MINUTES_MAX = 10_080;

export const MAX_ADVERTISEMENTS_PER_USER = 3;

/** Maksymalny rozmiar zdjęcia ogłoszenia: 5MB. Musi być zsynchronizowany z `fileSize`
 *  w `@fastify/multipart` w `main.ts` i z walidacją na froncie. */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_MB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
