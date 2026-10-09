import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrepareSearchNormalization1787788799999 implements MigrationInterface {
  /** Consolidate legacy collisions to one survivor before historical migration 0007. */
  async up(queryRunner: QueryRunner): Promise<void> {
    const applied = (await queryRunner.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      ['NormalizeSearchableText1787788800007'],
    )) as unknown[];
    if (applied.length || !(await queryRunner.hasTable('skills'))) return;
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS unaccent');
    // A unique minimum-ID mapping avoids UPDATE FROM choosing an intermediate
    // duplicate that 0007 subsequently deletes. Preserve each distinct association.
    for (const [table, links, owner, target] of [
      ['skills', 'members_skills_skills', 'membersId', 'skillsId'],
      ['project_labels', 'project_label_assignments', 'project_id', 'label_id'],
    ]) {
      const mapping = `SELECT id, min(id) OVER (
        PARTITION BY unaccent(lower(regexp_replace(trim(name), '\\s+', ' ', 'g')))
      ) AS survivor FROM ${table}`;
      await queryRunner.query(`
        WITH mapping AS (${mapping})
        INSERT INTO ${links} ("${owner}", "${target}")
        SELECT DISTINCT link."${owner}", mapping.survivor
        FROM ${links} link JOIN mapping ON link."${target}" = mapping.id
        ON CONFLICT DO NOTHING
      `);
      await queryRunner.query(`
        WITH mapping AS (${mapping})
        DELETE FROM ${links} link USING mapping
        WHERE link."${target}" = mapping.id AND mapping.id <> mapping.survivor
      `);
      await queryRunner.query(`
        WITH mapping AS (${mapping})
        DELETE FROM ${table} item USING mapping
        WHERE item.id = mapping.id AND mapping.id <> mapping.survivor
      `);
    }
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
  /** Restore the legacy column name; merged duplicate identities cannot be recreated. */
  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('skills', 'legacy_normalized_name')) {
      await queryRunner.query(
        'ALTER TABLE skills RENAME COLUMN legacy_normalized_name TO normalized_name',
      );
    }
  }
}
