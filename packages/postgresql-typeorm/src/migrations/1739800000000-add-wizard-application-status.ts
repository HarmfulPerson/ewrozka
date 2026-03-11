import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWizardApplicationStatus1739800000000 implements MigrationInterface {
  name = 'AddWizardApplicationStatus1739800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "wizard_application_status" VARCHAR(20) NULL DEFAULT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_wizard_application_status"
        ON "user" ("wizard_application_status")
        WHERE "wizard_application_status" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_wizard_application_status"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "wizard_application_status"`);
  }
}
