import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserVideo1740200000000 implements MigrationInterface {
  name = 'AddUserVideo1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "video" VARCHAR(500) NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "video"`);
  }
}
