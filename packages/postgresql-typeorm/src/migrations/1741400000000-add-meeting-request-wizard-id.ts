import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeetingRequestWizardId1741400000000 implements MigrationInterface {
  name = 'AddMeetingRequestWizardId1741400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD COLUMN IF NOT EXISTS "wizard_id" integer NULL DEFAULT NULL
    `);
    await queryRunner.query(`
      UPDATE "meeting_request" mr
      SET wizard_id = (SELECT user_id FROM "advertisement" a WHERE a.id = mr.advertisement_id)
      WHERE mr.advertisement_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      DROP COLUMN IF EXISTS "wizard_id"
    `);
  }
}
