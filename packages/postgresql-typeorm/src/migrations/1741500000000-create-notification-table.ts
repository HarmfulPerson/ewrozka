import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTable1741500000000 implements MigrationInterface {
  name = 'CreateNotificationTable1741500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "type" character varying(50) NOT NULL,
        "title" character varying(200) NOT NULL,
        "body" text,
        "link" character varying(500),
        "meta" jsonb DEFAULT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_notification_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_user" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_user_id" ON "notification" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_user_read" ON "notification" ("user_id", "read")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_created_at" ON "notification" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_user_read"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);
  }
}
