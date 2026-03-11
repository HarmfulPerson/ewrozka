import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdvertisementTable1732100000000
  implements MigrationInterface
{
  name = 'CreateAdvertisementTable1732100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "advertisement" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "description" character varying NOT NULL DEFAULT '',
        "image_url" character varying NOT NULL DEFAULT '',
        "price_grosze" integer NOT NULL DEFAULT 0,
        "duration_minutes" integer NOT NULL,
        "user_id" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_advertisement_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ADD CONSTRAINT "FK_advertisement_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "advertisement" DROP CONSTRAINT "FK_advertisement_user"`,
    );
    await queryRunner.query(`DROP TABLE "advertisement"`);
  }
}
