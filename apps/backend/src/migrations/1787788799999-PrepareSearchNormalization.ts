import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrepareSearchNormalization1787788799999 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const applied = (await queryRunner.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      ['NormalizeSearchableText1787788800007'],
    )) as unknown[];
    if (applied.length || !(await queryRunner.hasTable('skills'))) return;
    // synchronize may already have created the derived column before migration 0007.
    // Preserve it until normalization completes; original names and associations stay intact.
    if (await queryRunner.hasColumn('skills', 'normalized_name')) {
      await queryRunner.query(
        'ALTER TABLE skills RENAME COLUMN normalized_name TO legacy_normalized_name',
      );
      await queryRunner.query(
        'ALTER INDEX IF EXISTS "IDX_skills_normalized_name" RENAME TO "IDX_skills_legacy_normalized_name"',
      );
    }
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_project_labels_normalized_name"',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('skills', 'legacy_normalized_name')) {
      await queryRunner.query(
        'ALTER TABLE skills RENAME COLUMN legacy_normalized_name TO normalized_name',
      );
    }
  }
}
