import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvailabilityAppointmentAndMeetingRequestFields1732300000000
  implements MigrationInterface
{
  name = 'AddAvailabilityAppointmentAndMeetingRequestFields1732300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD COLUMN "requested_starts_at" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ALTER COLUMN "preferred_date" DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "availability" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_availability_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "availability"
      ADD CONSTRAINT "FK_availability_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "appointment" (
        "id" SERIAL NOT NULL,
        "client_id" integer NOT NULL,
        "wrozka_id" integer NOT NULL,
        "advertisement_id" integer NOT NULL,
        "meeting_request_id" integer,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "duration_minutes" integer NOT NULL,
        "price_grosze" integer NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'accepted',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointment_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_client"
      FOREIGN KEY ("client_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_wrozka"
      FOREIGN KEY ("wrozka_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_advertisement"
      FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD CONSTRAINT "FK_appointment_meeting_request"
      FOREIGN KEY ("meeting_request_id") REFERENCES "meeting_request"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_meeting_request"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_advertisement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_wrozka"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_appointment_client"`,
    );
    await queryRunner.query(`DROP TABLE "appointment"`);

    await queryRunner.query(
      `ALTER TABLE "availability" DROP CONSTRAINT "FK_availability_user"`,
    );
    await queryRunner.query(`DROP TABLE "availability"`);

    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ALTER COLUMN "preferred_date" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      DROP COLUMN "requested_starts_at"
    `);
  }
}
