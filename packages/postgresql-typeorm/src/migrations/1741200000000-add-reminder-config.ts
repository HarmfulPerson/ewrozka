import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminderConfig1741200000000 implements MigrationInterface {
  name = 'AddReminderConfig1741200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reminder_config" (
        "id" SERIAL PRIMARY KEY,
        "enabled_48h" BOOLEAN NOT NULL DEFAULT true,
        "enabled_24h" BOOLEAN NOT NULL DEFAULT true,
        "enabled_1h" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "reminder_config" ("id", "enabled_48h", "enabled_24h", "enabled_1h") VALUES (1, true, true, true)
    `);

    await queryRunner.query(`
      CREATE TABLE "reminder_log" (
        "id" SERIAL PRIMARY KEY,
        "entity_type" VARCHAR(20) NOT NULL,
        "entity_id" VARCHAR(36) NOT NULL,
        "hours_before" INTEGER NOT NULL,
        "sent_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_reminder_log_entity_type_id_hours" UNIQUE ("entity_type", "entity_id", "hours_before")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_reminder_log_lookup" ON "reminder_log" ("entity_type", "entity_id", "hours_before")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reminder_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reminder_config"`);
  }
}
