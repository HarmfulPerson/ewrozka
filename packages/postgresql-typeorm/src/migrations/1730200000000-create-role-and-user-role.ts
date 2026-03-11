import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoleAndUserRole1730200000000 implements MigrationInterface {
  name = 'CreateRoleAndUserRole1730200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "role" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_role_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_role_name" ON "role" ("name")
    `);
    await queryRunner.query(`
      CREATE TABLE "user_role" (
        "user_id" integer NOT NULL,
        "role_id" integer NOT NULL,
        CONSTRAINT "PK_user_role" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_role_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_role_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      INSERT INTO "role" ("name") VALUES ('wizard'), ('client')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_role"`);
    await queryRunner.query(`DROP INDEX "UQ_role_name"`);
    await queryRunner.query(`DROP TABLE "role"`);
  }
}
