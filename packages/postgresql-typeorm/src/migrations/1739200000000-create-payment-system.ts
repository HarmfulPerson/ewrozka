import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentSystem1739200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wallet table
    await queryRunner.query(`
      CREATE TABLE "wallet" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "balance" BIGINT NOT NULL DEFAULT 0,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'PLN',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_wallet_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_user" ON "wallet" ("user_id")
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "wallet"."balance" IS 'Balance in grosze (1/100 PLN)'
    `);

    // Create transaction table
    await queryRunner.query(`
      CREATE TABLE "transaction" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "appointment_id" INTEGER NOT NULL,
        "total_amount" BIGINT NOT NULL,
        "platform_fee" BIGINT NOT NULL,
        "wizard_amount" BIGINT NOT NULL,
        "type" VARCHAR(50) NOT NULL DEFAULT 'payment',
        "status" VARCHAR(50) NOT NULL DEFAULT 'completed',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_transaction_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transaction_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_user" ON "transaction" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_appointment" ON "transaction" ("appointment_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_created_at" ON "transaction" ("created_at")
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "transaction"."user_id" IS 'Wizard (recipient) ID'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "transaction"."total_amount" IS 'Total amount paid by client in grosze'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "transaction"."platform_fee" IS 'Platform fee in grosze'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "transaction"."wizard_amount" IS 'Amount credited to wizard in grosze'
    `);

    // Create platform_revenue table
    await queryRunner.query(`
      CREATE TABLE "platform_revenue" (
        "id" SERIAL PRIMARY KEY,
        "date" DATE NOT NULL UNIQUE,
        "total_fees" BIGINT NOT NULL DEFAULT 0,
        "total_wizard_payouts" BIGINT NOT NULL DEFAULT 0,
        "total_volume" BIGINT NOT NULL DEFAULT 0,
        "transaction_count" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_platform_revenue_date" ON "platform_revenue" ("date")
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "platform_revenue"."total_fees" IS 'Total platform fees collected in grosze'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "platform_revenue"."total_wizard_payouts" IS 'Total amount paid to wizards in grosze'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "platform_revenue"."total_volume" IS 'Total transaction volume in grosze'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_revenue"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet"`);
  }
}
