import { registerAs } from '@nestjs/config';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { PaymentConfig } from './config.type';
import { validateConfig } from '@repo/nest-common';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(0)
  @Max(100)
  PLATFORM_FEE_PERCENTAGE!: number;

  @IsString()
  PAYMENT_CURRENCY!: string;
}

export default registerAs<PaymentConfig>('payment', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    platformFeePercentage: parseInt(process.env.PLATFORM_FEE_PERCENTAGE || '20', 10),
    currency: process.env.PAYMENT_CURRENCY || 'PLN',
  };
});
