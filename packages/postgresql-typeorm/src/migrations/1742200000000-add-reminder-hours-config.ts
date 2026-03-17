import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminderHoursConfig1742200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reminder_config"
        ADD COLUMN "hours_slot1" integer NOT NULL DEFAULT 48,
        ADD COLUMN "hours_slot2" integer NOT NULL DEFAULT 24,
        ADD COLUMN "hours_slot3" integer NOT NULL DEFAULT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reminder_config"
        DROP COLUMN "hours_slot3",
        DROP COLUMN "hours_slot2",
        DROP COLUMN "hours_slot1";
    `);
  }
}
