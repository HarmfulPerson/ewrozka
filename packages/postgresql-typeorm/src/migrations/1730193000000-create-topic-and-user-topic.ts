import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTopicAndUserTopic1730193000000 implements MigrationInterface {
  name = 'CreateTopicAndUserTopic1730193000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "topic" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_topic_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_topic_name" ON "topic" ("name")
    `);

    await queryRunner.query(`
      CREATE TABLE "user_topic" (
        "user_id" integer NOT NULL,
        "topic_id" integer NOT NULL,
        CONSTRAINT "PK_user_topic" PRIMARY KEY ("user_id", "topic_id"),
        CONSTRAINT "FK_user_topic_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_topic_topic" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_topic_user_id" ON "user_topic" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_topic_topic_id" ON "user_topic" ("topic_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_topic_topic_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_topic_user_id"`);
    await queryRunner.query(`DROP TABLE "user_topic"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_topic_name"`);
    await queryRunner.query(`DROP TABLE "topic"`);
  }
}
