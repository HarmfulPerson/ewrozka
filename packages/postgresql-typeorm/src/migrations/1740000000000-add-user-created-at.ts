import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCreatedAt1740000000000 implements MigrationInterface {
  name = 'AddUserCreatedAt1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "created_at"`);
  }
}
