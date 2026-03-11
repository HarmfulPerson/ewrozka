import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWizardApplication1740100000000 implements MigrationInterface {
  name = 'CreateWizardApplication1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wizard_application" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"            VARCHAR(255) NOT NULL UNIQUE,
        "username"         VARCHAR(255) NOT NULL,
        "password_hash"    VARCHAR(500) NOT NULL,
        "bio"              TEXT NOT NULL DEFAULT '',
        "phone"            VARCHAR(20) NULL,
        "image"            VARCHAR(500) NOT NULL DEFAULT '',
        "topic_ids"        JSONB NOT NULL DEFAULT '[]',
        "status"           VARCHAR(20) NOT NULL DEFAULT 'pending',
        "rejection_reason" TEXT NULL,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wizard_application_status"
        ON "wizard_application" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wizard_application_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wizard_application"`);
  }
}
