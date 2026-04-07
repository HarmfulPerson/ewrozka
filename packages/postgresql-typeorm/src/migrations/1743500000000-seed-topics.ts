import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTopics1743500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO topic (id, name) VALUES
        (1, 'Tarot'),
        (2, 'Astrologia'),
        (3, 'Numerologia'),
        (4, 'Runy'),
        (5, 'Karty Lenormand'),
        (6, 'Karty cygańskie'),
        (7, 'Psychologia i wsparcie'),
        (8, 'Medytacja'),
        (9, 'Radiestezja i wahadło'),
        (10, 'Biorytmy'),
        (11, 'Feng shui'),
        (12, 'Ziołolecznictwo'),
        (13, 'Jasnowidzenie'),
        (14, 'Interpretacja snów'),
        (15, 'Channeling'),
        (16, 'Kryształowa kula'),
        (17, 'Rękawiczka runiczna'),
        (18, 'Chiromancja (czytanie z dłoni)')
      ON CONFLICT (id) DO NOTHING
    `);

    // Reset sequence to max id
    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('topic', 'id'), COALESCE(MAX(id), 1)) FROM topic
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM topic WHERE id IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18)
    `);
  }
}
