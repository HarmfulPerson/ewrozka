import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdFkSetNull1740300000000 implements MigrationInterface {
  name = 'AdFkSetNull1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // appointment.advertisement_id → nullable + SET NULL
    await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT IF EXISTS "FK_appointment_advertisement"`);
    await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "advertisement_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_advertisement"
      FOREIGN KEY ("advertisement_id")
      REFERENCES "advertisement"("id")
      ON DELETE SET NULL
    `);

    // meeting_request.advertisement_id → nullable + SET NULL
    await queryRunner.query(`ALTER TABLE "meeting_request" DROP CONSTRAINT IF EXISTS "FK_meeting_request_advertisement"`);
    await queryRunner.query(`ALTER TABLE "meeting_request" ALTER COLUMN "advertisement_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD CONSTRAINT "FK_meeting_request_advertisement"
      FOREIGN KEY ("advertisement_id")
      REFERENCES "advertisement"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT IF EXISTS "FK_appointment_advertisement"`);
    await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "advertisement_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_advertisement"
      FOREIGN KEY ("advertisement_id")
      REFERENCES "advertisement"("id")
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`ALTER TABLE "meeting_request" DROP CONSTRAINT IF EXISTS "FK_meeting_request_advertisement"`);
    await queryRunner.query(`ALTER TABLE "meeting_request" ALTER COLUMN "advertisement_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD CONSTRAINT "FK_meeting_request_advertisement"
      FOREIGN KEY ("advertisement_id")
      REFERENCES "advertisement"("id")
      ON DELETE RESTRICT
    `);
  }
}
