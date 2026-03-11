import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1739600000000 implements MigrationInterface {
  name = 'AddEmailVerification1739600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "emailVerificationToken" varchar(64) NULL DEFAULT NULL
    `);

    // Istniejące konta traktujemy jako już zweryfikowane
    await queryRunner.query(`UPDATE "user" SET "emailVerified" = true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN IF EXISTS "emailVerified",
        DROP COLUMN IF EXISTS "emailVerificationToken"
    `);
  }
}
