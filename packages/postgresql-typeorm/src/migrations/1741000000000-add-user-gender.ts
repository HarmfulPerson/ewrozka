import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserGender1741000000000 implements MigrationInterface {
  name = 'AddUserGender1741000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "gender" varchar(10) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "wizard_application"
      ADD COLUMN IF NOT EXISTS "gender" varchar(10) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "gender"`);
    await queryRunner.query(
      `ALTER TABLE "wizard_application" DROP COLUMN IF EXISTS "gender"`,
    );
  }
}
