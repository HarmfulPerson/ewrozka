import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeetingRequestTable1732200000000
  implements MigrationInterface
{
  name = 'CreateMeetingRequestTable1732200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meeting_request" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "advertisement_id" integer NOT NULL,
        "preferred_date" date NOT NULL,
        "message" character varying(1000) NOT NULL DEFAULT '',
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_request_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD CONSTRAINT "FK_meeting_request_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "meeting_request"
      ADD CONSTRAINT "FK_meeting_request_advertisement"
      FOREIGN KEY ("advertisement_id") REFERENCES "advertisement"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meeting_request" DROP CONSTRAINT "FK_meeting_request_advertisement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_request" DROP CONSTRAINT "FK_meeting_request_user"`,
    );
    await queryRunner.query(`DROP TABLE "meeting_request"`);
  }
}
