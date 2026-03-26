import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralSystem1743000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // User: referral_code + referred_by
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "referral_code" VARCHAR(12) DEFAULT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_referral_code" ON "user" ("referral_code") WHERE "referral_code" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "referred_by" INT DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_user_referred_by" FOREIGN KEY ("referred_by") REFERENCES "user"("id") ON DELETE SET NULL`,
    );

    // WizardApplication: referral_code_used
    await queryRunner.query(
      `ALTER TABLE "wizard_application" ADD COLUMN "referral_code_used" VARCHAR(12) DEFAULT NULL`,
    );

    // Backfill: generate referral codes for existing users
    await queryRunner.query(`
      UPDATE "user"
      SET "referral_code" = LOWER(SUBSTR(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
      WHERE "referral_code" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wizard_application" DROP COLUMN "referral_code_used"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_user_referred_by"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "referred_by"`);
    await queryRunner.query(
      `DROP INDEX "UQ_user_referral_code"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "referral_code"`);
  }
}
