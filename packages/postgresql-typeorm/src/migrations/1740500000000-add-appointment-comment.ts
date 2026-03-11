import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentComment1740500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointment" ADD COLUMN IF NOT EXISTS "comment" text DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN IF EXISTS "comment"`);
  }
}
