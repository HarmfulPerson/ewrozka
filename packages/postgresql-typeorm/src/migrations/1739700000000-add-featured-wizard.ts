import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeaturedWizard1739700000000 implements MigrationInterface {
  name = 'AddFeaturedWizard1739700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "featured_wizard" (
        "id"                        SERIAL PRIMARY KEY,
        "user_id"                   INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "stripe_payment_intent_id"  VARCHAR(255) NULL,
        "paid_at"                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "expires_at"                TIMESTAMPTZ NOT NULL,
        "is_active"                 BOOLEAN NOT NULL DEFAULT true,
        "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_featured_wizard_user_active"
        ON "featured_wizard" ("user_id", "is_active")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_featured_wizard_expires"
        ON "featured_wizard" ("expires_at", "is_active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "featured_wizard"`);
  }
}
