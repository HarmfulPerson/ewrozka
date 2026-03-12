import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionTierConfig1740700000000 implements MigrationInterface {
  name = 'AddCommissionTierConfig1740700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "platform_fee_config" (
        "id" SERIAL PRIMARY KEY,
        "window_days" INTEGER NOT NULL DEFAULT 90,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "platform_fee_tier" (
        "id" SERIAL PRIMARY KEY,
        "config_id" INTEGER NOT NULL,
        "min_meetings" INTEGER NOT NULL DEFAULT 0,
        "max_meetings" INTEGER NULL,
        "fee_percent" SMALLINT NOT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_platform_fee_tier_config" FOREIGN KEY ("config_id") REFERENCES "platform_fee_config"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      INSERT INTO "platform_fee_config" ("id", "window_days") VALUES (1, 90)
    `);
    await queryRunner.query(`
      INSERT INTO "platform_fee_tier" ("config_id", "min_meetings", "max_meetings", "fee_percent", "sort_order") VALUES
        (1, 0, 29, 20, 0),
        (1, 30, 59, 18, 1),
        (1, 60, 99, 16, 2),
        (1, 100, NULL, 14, 3)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_fee_tier"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_fee_config"`);
  }
}
