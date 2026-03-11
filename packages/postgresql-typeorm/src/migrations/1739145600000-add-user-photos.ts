import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhotos1739145600000 implements MigrationInterface {
  name = 'AddUserPhotos1739145600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN "image2" character varying NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN "image3" character varying NOT NULL DEFAULT ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" 
      DROP COLUMN "image3"
    `);
    await queryRunner.query(`
      ALTER TABLE "user" 
      DROP COLUMN "image2"
    `);
  }
}
