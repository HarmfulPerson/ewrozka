import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPlatformFeePercentDefault1742300000000
  implements MigrationInterface
{
  name = 'FixPlatformFeePercentDefault1742300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix the column default from 20 to NULL
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "platform_fee_percent" SET DEFAULT NULL
    `);

    // Clear false "set by admin" values — reset to NULL for users
    // where admin never explicitly set the fee.
    // We keep the value only if admin set it via the panel
    // (there's no reliable way to distinguish, so reset all to NULL
    //  and let admins re-set manually if needed).
    await queryRunner.query(`
      UPDATE "user"
      SET "platform_fee_percent" = NULL
      WHERE "platform_fee_percent" = 20
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "platform_fee_percent" SET DEFAULT 20
    `);
  }
}
