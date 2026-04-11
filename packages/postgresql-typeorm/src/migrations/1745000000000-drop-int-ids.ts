import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 7 of the int-id → uid migration: drop the numeric `id` primary keys
 * and every numeric foreign-key column. After this migration, `uid` is the
 * only identifier anywhere in the schema. FK columns keep their original
 * names (user_id, client_id, etc.) but change type from integer to uuid and
 * point at parent.uid.
 *
 * This migration is DESTRUCTIVE and irreversible without a backup.
 * - All 24 tables with int PKs lose the `id` column entirely. The `uid`
 *   column becomes the new primary key and is NOT renamed.
 * - All 35 foreign-key columns (plus soft-FK columns like
 *   meeting_request.wizard_id and user.referred_by) change type.
 * - Junction tables (user_role, article_to_tag, user_favorites, user_topic)
 *   get their composite PK rebuilt with the new uuid column types.
 * - guest_booking keeps its uuid id but its two FK columns get migrated.
 * - wizard_application is left untouched (no int id, no FKs).
 *
 * Strategy: single transaction, ordered passes.
 *   1. Populate temp uuid columns on every child by joining to parent.uid.
 *   2. Drop every FK constraint.
 *   3. Drop composite PKs on junction tables.
 *   4. For every parent table, drop the int PK + int `id` column (keep `uid`,
 *      promote it to the new PK).
 *   5. For every child table, drop old int `*_id`, rename temp `*_new`
 *      → original name.
 *   6. Rebuild composite PKs on junction tables.
 *   7. Restore NOT NULL on columns that were originally NOT NULL.
 *   8. Re-add every FK constraint with the new uuid types, pointing at uid.
 *
 * If this fails mid-way, run down() to roll back, or restore from backup.
 */
export class DropIntIds1745000000000 implements MigrationInterface {
  name = 'DropIntIds1745000000000';

  // Tables whose int `id` PK becomes uuid (uid → id rename at the end).
  private readonly parentTables = [
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

  // Every int FK/soft-FK column in the schema: [childTable, childColumn, parentTable]
  private readonly fks: Array<[string, string, string]> = [
    ['advertisement', 'user_id', 'user'],
    ['appointment', 'advertisement_id', 'advertisement'],
    ['appointment', 'client_id', 'user'],
    ['appointment', 'meeting_request_id', 'meeting_request'],
    ['appointment', 'wrozka_id', 'user'],
    ['article', 'author_id', 'user'],
    ['article_to_tag', 'article_id', 'article'],
    ['article_to_tag', 'tag_id', 'tag'],
    ['availability', 'user_id', 'user'],
    ['comment', 'article_id', 'article'],
    ['comment', 'author_id', 'user'],
    ['featured_wizard', 'user_id', 'user'],
    ['guest_booking', 'advertisement_id', 'advertisement'],
    ['guest_booking', 'wizard_id', 'user'],
    ['meeting_event', 'meeting_room_id', 'meeting_room'],
    ['meeting_event', 'user_id', 'user'],
    ['meeting_request', 'advertisement_id', 'advertisement'],
    ['meeting_request', 'user_id', 'user'],
    ['meeting_request', 'wizard_id', 'user'], // soft FK (no constraint)
    ['meeting_room', 'appointment_id', 'appointment'],
    ['notification', 'user_id', 'user'],
    ['platform_fee_tier', 'config_id', 'platform_fee_config'],
    ['stripe_connect_account', 'user_id', 'user'],
    ['transaction', 'appointment_id', 'appointment'],
    ['transaction', 'user_id', 'user'],
    ['user', 'referred_by', 'user'], // self-ref, soft FK
    ['user_favorites', 'article_id', 'article'],
    ['user_favorites', 'user_id', 'user'],
    ['user_follows', 'followee_id', 'user'],
    ['user_follows', 'follower_id', 'user'],
    ['user_role', 'role_id', 'role'],
    ['user_role', 'user_id', 'user'],
    ['user_topic', 'topic_id', 'topic'],
    ['user_topic', 'user_id', 'user'],
    ['wallet', 'user_id', 'user'],
    ['withdrawal', 'user_id', 'user'],
  ];

  // Original FK constraint names to drop and re-create.
  private readonly fkConstraints: Array<{
    child: string;
    constraint: string;
    column: string;
    parent: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE';
  }> = [
    { child: 'advertisement', constraint: 'FK_advertisement_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'appointment', constraint: 'FK_appointment_advertisement', column: 'advertisement_id', parent: 'advertisement', onDelete: 'SET NULL' },
    { child: 'appointment', constraint: 'FK_appointment_client', column: 'client_id', parent: 'user' },
    { child: 'appointment', constraint: 'FK_appointment_meeting_request', column: 'meeting_request_id', parent: 'meeting_request', onDelete: 'SET NULL' },
    { child: 'appointment', constraint: 'FK_appointment_wrozka', column: 'wrozka_id', parent: 'user' },
    { child: 'article', constraint: 'FK_article_user', column: 'author_id', parent: 'user' },
    { child: 'article_to_tag', constraint: 'FK_article_to_tag_article', column: 'article_id', parent: 'article', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    { child: 'article_to_tag', constraint: 'FK_article_to_tag_tag', column: 'tag_id', parent: 'tag', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    { child: 'availability', constraint: 'FK_availability_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'comment', constraint: 'FK_comment_article', column: 'article_id', parent: 'article', onDelete: 'CASCADE' },
    { child: 'comment', constraint: 'FK_comment_user', column: 'author_id', parent: 'user' },
    { child: 'featured_wizard', constraint: 'featured_wizard_user_id_fkey', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'guest_booking', constraint: 'FK_guest_booking_advertisement', column: 'advertisement_id', parent: 'advertisement', onDelete: 'SET NULL' },
    { child: 'guest_booking', constraint: 'FK_guest_booking_wizard', column: 'wizard_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'meeting_event', constraint: 'FK_meeting_event_meeting_room', column: 'meeting_room_id', parent: 'meeting_room', onDelete: 'CASCADE' },
    { child: 'meeting_event', constraint: 'FK_meeting_event_user', column: 'user_id', parent: 'user' },
    { child: 'meeting_request', constraint: 'FK_meeting_request_advertisement', column: 'advertisement_id', parent: 'advertisement', onDelete: 'SET NULL' },
    { child: 'meeting_request', constraint: 'FK_meeting_request_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'meeting_room', constraint: 'FK_meeting_room_appointment', column: 'appointment_id', parent: 'appointment', onDelete: 'CASCADE' },
    { child: 'notification', constraint: 'FK_notification_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'platform_fee_tier', constraint: 'FK_platform_fee_tier_config', column: 'config_id', parent: 'platform_fee_config', onDelete: 'CASCADE' },
    { child: 'stripe_connect_account', constraint: 'FK_stripe_connect_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'transaction', constraint: 'FK_transaction_appointment', column: 'appointment_id', parent: 'appointment', onDelete: 'SET NULL' },
    { child: 'transaction', constraint: 'FK_transaction_user', column: 'user_id', parent: 'user' },
    { child: 'user', constraint: 'FK_user_referred_by', column: 'referred_by', parent: 'user', onDelete: 'SET NULL' },
    { child: 'user_favorites', constraint: 'FK_user_favorites_article', column: 'article_id', parent: 'article' },
    { child: 'user_favorites', constraint: 'FK_user_favorites_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    { child: 'user_follows', constraint: 'FK_user_follows_followee_id', column: 'followee_id', parent: 'user' },
    { child: 'user_follows', constraint: 'FK_user_follows_follower_id', column: 'follower_id', parent: 'user' },
    { child: 'user_role', constraint: 'FK_user_role_role', column: 'role_id', parent: 'role', onDelete: 'CASCADE' },
    { child: 'user_role', constraint: 'FK_user_role_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'user_topic', constraint: 'FK_user_topic_topic', column: 'topic_id', parent: 'topic', onDelete: 'CASCADE' },
    { child: 'user_topic', constraint: 'FK_user_topic_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'wallet', constraint: 'FK_wallet_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
    { child: 'withdrawal', constraint: 'FK_withdrawal_user', column: 'user_id', parent: 'user', onDelete: 'CASCADE' },
  ];

  // Junction tables whose composite PK needs to be rebuilt with uuid columns.
  private readonly junctionPks: Array<{ table: string; pk: string; columns: [string, string] }> = [
    { table: 'user_role', pk: 'PK_user_role', columns: ['user_id', 'role_id'] },
    { table: 'user_topic', pk: 'PK_user_topic', columns: ['user_id', 'topic_id'] },
    { table: 'article_to_tag', pk: 'PK_4c89558cd6aba7068f591dfafb5', columns: ['article_id', 'tag_id'] },
    { table: 'user_favorites', pk: 'PK_844adcf6e9231c9afb76fe2e4ce', columns: ['user_id', 'article_id'] },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Pass 1: For every child column, add temp *_new uuid column populated
    //            from a join to the parent's existing uid column. ──
    for (const [child, col, parent] of this.fks) {
      const tempCol = `${col}_new`;
      await queryRunner.query(
        `ALTER TABLE "${child}" ADD COLUMN "${tempCol}" uuid`,
      );
      // Join to parent by int id → copy parent's uid into the new column.
      // For nullable columns and soft FKs (like referred_by or wizard_id),
      // a NULL parent stays NULL.
      await queryRunner.query(
        `UPDATE "${child}" c SET "${tempCol}" = p."uid" FROM "${parent}" p WHERE c."${col}" = p."id"`,
      );
    }

    // ── Pass 2: Drop every FK constraint. ──
    for (const fk of this.fkConstraints) {
      await queryRunner.query(
        `ALTER TABLE "${fk.child}" DROP CONSTRAINT IF EXISTS "${fk.constraint}"`,
      );
    }

    // ── Pass 3: Drop composite PKs on junction tables. ──
    for (const { table, pk } of this.junctionPks) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${pk}"`,
      );
    }

    // ── Pass 4: For each parent table, drop the int PK constraint + int `id`
    //            column. Keep `uid` as-is and promote it to the new PK. ──
    for (const table of this.parentTables) {
      // Drop the PK constraint. Its name follows the PK_<table>_id convention
      // used throughout the entity definitions.
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "PK_${table}_id"`,
      );
      // Also try the autoload name that TypeORM sometimes picks — e.g. for
      // notification which uses @PrimaryGeneratedColumn() with no explicit name.
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_pkey"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "id"`);
      // Drop the unique index on uid — we'll replace it with the PK.
      await queryRunner.query(`DROP INDEX IF EXISTS "UQ_${table}_uid"`);
      // uid stays named `uid` and becomes the new primary key.
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "PK_${table}_uid" PRIMARY KEY ("uid")`,
      );
    }

    // ── Pass 5: For each child table, drop the old int column and rename
    //            the temp *_new uuid column back to the original name. ──
    for (const [child, col] of this.fks) {
      const tempCol = `${col}_new`;
      await queryRunner.query(`ALTER TABLE "${child}" DROP COLUMN "${col}"`);
      await queryRunner.query(
        `ALTER TABLE "${child}" RENAME COLUMN "${tempCol}" TO "${col}"`,
      );
    }

    // ── Pass 6: Rebuild composite PKs on junction tables. ──
    for (const { table, pk, columns } of this.junctionPks) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${pk}" PRIMARY KEY ("${columns[0]}", "${columns[1]}")`,
      );
    }

    // ── Pass 7: Restore NOT NULL on columns that were originally NOT NULL.
    //            Postgres loses this when we drop+rename. ──
    const notNullCols: Array<[string, string]> = [
      ['advertisement', 'user_id'],
      ['appointment', 'client_id'],
      ['appointment', 'wrozka_id'],
      ['article', 'author_id'],
      ['article_to_tag', 'article_id'],
      ['article_to_tag', 'tag_id'],
      ['availability', 'user_id'],
      ['comment', 'article_id'],
      ['comment', 'author_id'],
      ['featured_wizard', 'user_id'],
      ['guest_booking', 'wizard_id'],
      ['meeting_event', 'meeting_room_id'],
      ['meeting_event', 'user_id'],
      ['meeting_request', 'user_id'],
      ['meeting_room', 'appointment_id'],
      ['notification', 'user_id'],
      ['platform_fee_tier', 'config_id'],
      ['stripe_connect_account', 'user_id'],
      ['transaction', 'user_id'],
      ['user_favorites', 'article_id'],
      ['user_favorites', 'user_id'],
      ['user_follows', 'followee_id'],
      ['user_follows', 'follower_id'],
      ['user_role', 'role_id'],
      ['user_role', 'user_id'],
      ['user_topic', 'topic_id'],
      ['user_topic', 'user_id'],
      ['wallet', 'user_id'],
      ['withdrawal', 'user_id'],
    ];
    for (const [table, col] of notNullCols) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${col}" SET NOT NULL`,
      );
    }

    // ── Pass 8: Re-add every FK constraint with the new uuid types, pointing
    //            at the parent's `uid` column (which is now the PK). ──
    //
    // guest_booking is a parent table for some FKs and still uses `id` as its
    // PK column (it's always been uuid). We reference `uid` for everything
    // else and `id` for guest_booking.
    const parentPkColumn = (parent: string): string =>
      parent === 'guest_booking' || parent === 'wizard_application' ? 'id' : 'uid';

    for (const fk of this.fkConstraints) {
      const pkCol = parentPkColumn(fk.parent);
      const parts = [
        `ALTER TABLE "${fk.child}"`,
        `ADD CONSTRAINT "${fk.constraint}"`,
        `FOREIGN KEY ("${fk.column}")`,
        `REFERENCES "${fk.parent}"("${pkCol}")`,
      ];
      if (fk.onDelete) parts.push(`ON DELETE ${fk.onDelete}`);
      if (fk.onUpdate) parts.push(`ON UPDATE ${fk.onUpdate}`);
      await queryRunner.query(parts.join(' '));
    }
  }

  public async down(): Promise<void> {
    throw new Error(
      'DropIntIds1745000000000 is not reversible. Restore from a pre-migration backup.',
    );
  }
}
