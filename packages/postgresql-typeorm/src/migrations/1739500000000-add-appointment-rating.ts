import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentRating1739500000000 implements MigrationInterface {
  name = 'AddAppointmentRating1739500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointment"
      ADD COLUMN IF NOT EXISTS "rating" smallint NULL
        CHECK ("rating" >= 0 AND "rating" <= 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN IF EXISTS "rating"`);
  }
}
