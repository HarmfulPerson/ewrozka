import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fixes dangerous ON DELETE CASCADE chains that were deleting financial records:
 *
 *  advertisement deleted
 *    → FK_appointment_advertisement CASCADE → appointment deleted
 *      → FK_transaction_appointment CASCADE → transaction deleted  ← BAD
 *    → FK_meeting_request_advertisement CASCADE → meeting_request deleted ← BAD
 *
 * After migration:
 *  - FK_appointment_advertisement        → RESTRICT   (appointment stays, service-level guard exists)
 *  - FK_meeting_request_advertisement    → RESTRICT   (request stays, service-level guard exists)
 *  - FK_transaction_appointment          → SET NULL   (transaction stays, appointment_id becomes nullable)
 */
export class FixCascadePreservingFinancialRecords1739400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. appointment.advertisement_id: CASCADE → RESTRICT
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_advertisement"`,
    );
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_advertisement"
      FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // 2. meeting_request.advertisement_id: CASCADE → RESTRICT
    await queryRunner.query(
      `ALTER TABLE "meeting_request" DROP CONSTRAINT "FK_meeting_request_advertisement"`,
    );
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD CONSTRAINT "FK_meeting_request_advertisement"
      FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // 3. transaction.appointment_id: make nullable + CASCADE → SET NULL
    await queryRunner.query(
      `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_appointment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ALTER COLUMN "appointment_id" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "transaction"
      ADD CONSTRAINT "FK_transaction_appointment"
      FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert transaction FK
    await queryRunner.query(
      `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_appointment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ALTER COLUMN "appointment_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "transaction"
      ADD CONSTRAINT "FK_transaction_appointment"
      FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Revert meeting_request FK
    await queryRunner.query(
      `ALTER TABLE "meeting_request" DROP CONSTRAINT "FK_meeting_request_advertisement"`,
    );
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD CONSTRAINT "FK_meeting_request_advertisement"
      FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Revert appointment FK
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_advertisement"`,
    );
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_advertisement"
      FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }
}
