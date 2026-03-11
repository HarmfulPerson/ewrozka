import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhone1739900000000 implements MigrationInterface {
  name = 'AddUserPhone1739900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20) NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "phone"`);
  }
}
