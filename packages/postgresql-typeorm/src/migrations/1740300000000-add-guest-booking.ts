import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestBooking1740300000000 implements MigrationInterface {
  name = 'AddGuestBooking1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "guest_booking" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "wizard_id"        INTEGER NOT NULL,
        "advertisement_id" INTEGER NULL DEFAULT NULL,
        "guest_name"       VARCHAR(100) NOT NULL,
        "guest_email"      VARCHAR(200) NOT NULL,
        "guest_phone"      VARCHAR(20)  NULL DEFAULT NULL,
        "message"          TEXT NULL DEFAULT NULL,
        "scheduled_at"     TIMESTAMPTZ NOT NULL,
        "duration_minutes" INTEGER NOT NULL,
        "price_grosze"     INTEGER NOT NULL,
        "status"           VARCHAR(20) NOT NULL DEFAULT 'pending',
        "guest_token"      UUID NULL DEFAULT NULL,
        "stripe_session_id" VARCHAR(200) NULL DEFAULT NULL,
        "rejection_reason" TEXT NULL DEFAULT NULL,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_guest_booking_wizard"
          FOREIGN KEY ("wizard_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_guest_booking_advertisement"
          FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_guest_booking_wizard_id" ON "guest_booking" ("wizard_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_guest_booking_status"    ON "guest_booking" ("status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_guest_booking_guest_token" ON "guest_booking" ("guest_token") WHERE "guest_token" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "guest_booking"`);
  }
}
