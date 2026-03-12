import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformFeePercent1740600000000 implements MigrationInterface {
  name = 'AddPlatformFeePercent1740600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "platform_fee_percent" SMALLINT NULL DEFAULT 20
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "platform_fee_percent"`,
    );
  }
}
