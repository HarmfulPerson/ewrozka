import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeetingRequestRejectionReason1741300000000 implements MigrationInterface {
  name = 'AddMeetingRequestRejectionReason1741300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      DROP COLUMN IF EXISTS "rejection_reason"
    `);
  }
}
