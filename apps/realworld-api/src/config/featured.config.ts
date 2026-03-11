import { registerAs } from '@nestjs/config';

export type FeaturedConfig = {
  /** Cena wyróżnienia w groszach (domyślnie 2999 = 29,99 zł) */
  priceGrosze: number;
  /** Czas trwania wyróżnienia w godzinach (domyślnie 6) */
  durationHours: number;
  /** Liczba slotów wyróżnionych wróżek widocznych jednocześnie (domyślnie 6) */
  slots: number;
  /** Interwał rotacji w sekundach (domyślnie 90 = 1,5 min) */
  rotationSeconds: number;
};

export default registerAs<FeaturedConfig>('featured', () => ({
  priceGrosze: parseInt(process.env.FEATURED_PRICE_GROSZE ?? '2999', 10),
  durationHours: parseInt(process.env.FEATURED_DURATION_HOURS ?? '6', 10),
  slots: parseInt(process.env.FEATURED_SLOTS ?? '6', 10),
  rotationSeconds: parseInt(process.env.FEATURED_ROTATION_SECONDS ?? '90', 10),
}));
