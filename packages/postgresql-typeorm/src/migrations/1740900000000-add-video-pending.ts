import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoPending1740900000000 implements MigrationInterface {
  name = 'AddVideoPending1740900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "video_pending" VARCHAR(500) NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "video_pending"`);
  }
}
