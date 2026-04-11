import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 0 of the int-id → uid migration.
 *
 * Adds an additive `uid uuid NOT NULL DEFAULT gen_random_uuid()` column plus a
 * UNIQUE index to every table with an integer primary key. Existing rows get a
 * fresh UUID each (Postgres evaluates the volatile default per row during the
 * table rewrite), new rows auto-generate one on INSERT.
 *
 * This migration is completely backward compatible:
 *  - Existing `id` columns are untouched.
 *  - Foreign keys stay `int`.
 *  - No service / controller / DTO is aware of `uid` yet.
 *  - Can be rolled back with `down()` which drops the column cleanly.
 *
 * Phases 1+ will start exposing `uid` in the API surface per entity. Only
 * after every consumer migrates to `uid` do we consider dropping `id`.
 *
 * Skipped (already use uuid PKs):
 *  - guest_booking    (@PrimaryGeneratedColumn('uuid'))
 *  - wizard_application
 */
export class AddUidColumns1744000000000 implements MigrationInterface {
  name = 'AddUidColumns1744000000000';

  // Every table below has an integer PK that we want to eventually hide behind
  // a uid. Order doesn't matter (all additive, no FKs touched).
  private readonly tables = [
    'user',
    'advertisement',
    'appointment',
    'meeting_request',
    'meeting_room',
    'meeting_event',
    'availability',
    'article',
    'comment',
    'tag',
    'topic',
    'role',
    'user_follows',
    'notification',
    'wallet',
    'transaction',
    'withdrawal',
    'stripe_connect_account',
    'featured_wizard',
    'platform_fee_config',
    'platform_fee_tier',
    'platform_revenue',
    'reminder_config',
    'reminder_log',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() is built into pg_catalog in Postgres 13+. We run on
    // postgres:16-alpine so no extension is required. Kept the explicit
    // CREATE EXTENSION as a no-op safety net in case the image ever drifts.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    for (const table of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "uid" uuid NOT NULL DEFAULT gen_random_uuid()`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_${table}_uid" ON "${table}" ("uid")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "UQ_${table}_uid"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "uid"`,
      );
    }
  }
}
