import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleId1740800000000 implements MigrationInterface {
  name = 'AddGoogleId1740800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "google_id" varchar(64) NULL DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_user_google_id" ON "user" ("google_id")
      WHERE "google_id" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "wizard_application"
        ADD COLUMN IF NOT EXISTS "google_id" varchar(64) NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wizard_application" DROP COLUMN IF EXISTS "google_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_user_google_id"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "google_id"`);
  }
}
