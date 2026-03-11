import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeConnectAndWithdrawals1739300000000 implements MigrationInterface {
  name = 'AddStripeConnectAndWithdrawals1739300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stripe_connect_account" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "stripe_account_id" varchar(100) NOT NULL,
        "onboarding_completed" boolean NOT NULL DEFAULT false,
        "charges_enabled" boolean NOT NULL DEFAULT false,
        "payouts_enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stripe_connect_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stripe_connect_user" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_stripe_connect_user"
        ON "stripe_connect_account" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "withdrawal" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "amount_grosze" bigint NOT NULL,
        "stripe_account_id" varchar(100) NOT NULL,
        "stripe_transfer_id" varchar(100),
        "status" varchar(50) NOT NULL DEFAULT 'processing',
        "failure_reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_withdrawal_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_withdrawal_user" FOREIGN KEY ("user_id")
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_withdrawal_user" ON "withdrawal" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_withdrawal_user"`);
    await queryRunner.query(`DROP TABLE "withdrawal"`);
    await queryRunner.query(`DROP INDEX "IDX_stripe_connect_user"`);
    await queryRunner.query(`DROP TABLE "stripe_connect_account"`);
  }
}
