import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeetingRoomAndEvents1732400000000 implements MigrationInterface {
  name = 'AddMeetingRoomAndEvents1732400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meeting_room" (
        "id" SERIAL NOT NULL,
        "appointment_id" integer NOT NULL,
        "token" character varying(64) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_room_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_meeting_room_appointment_id" UNIQUE ("appointment_id"),
        CONSTRAINT "UQ_meeting_room_token" UNIQUE ("token")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "meeting_room"
      ADD CONSTRAINT "FK_meeting_room_appointment"
      FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "meeting_event" (
        "id" SERIAL NOT NULL,
        "meeting_room_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "event_type" character varying(20) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_event_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "meeting_event"
      ADD CONSTRAINT "FK_meeting_event_meeting_room"
      FOREIGN KEY ("meeting_room_id") REFERENCES "meeting_room"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "meeting_event"
      ADD CONSTRAINT "FK_meeting_event_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_event" DROP CONSTRAINT "FK_meeting_event_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_event" DROP CONSTRAINT "FK_meeting_event_meeting_room"`,
    );
    await queryRunner.query(`DROP TABLE "meeting_event"`);
    await queryRunner.query(
      `ALTER TABLE "meeting_room" DROP CONSTRAINT "FK_meeting_room_appointment"`,
    );
    await queryRunner.query(`DROP TABLE "meeting_room"`);
  }
}
