import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeSearchableText1787788800007 implements MigrationInterface {
  name = 'NormalizeSearchableText1787788800007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS unaccent');
    await queryRunner.query(
      'ALTER TABLE skills ADD COLUMN normalized_name varchar(120)',
    );
    await queryRunner.query(`
      UPDATE skills
      SET normalized_name = unaccent(lower(regexp_replace(trim(name), '\\s+', ' ', 'g')))
    `);
    await queryRunner.query(`
      DELETE FROM members_skills_skills duplicate
      USING members_skills_skills canonical, skills duplicate_skill, skills canonical_skill
      WHERE duplicate."skillsId" = duplicate_skill.id
        AND canonical."skillsId" = canonical_skill.id
        AND duplicate."membersId" = canonical."membersId"
        AND duplicate_skill.normalized_name = canonical_skill.normalized_name
        AND duplicate_skill.id > canonical_skill.id
    `);
    await queryRunner.query(`
      UPDATE members_skills_skills membership
      SET "skillsId" = canonical.id
      FROM skills duplicate, skills canonical
      WHERE membership."skillsId" = duplicate.id
        AND duplicate.normalized_name = canonical.normalized_name
        AND duplicate.id > canonical.id
    `);
    await queryRunner.query(`
      DELETE FROM skills duplicate
      USING skills canonical
      WHERE duplicate.normalized_name = canonical.normalized_name
        AND duplicate.id > canonical.id
    `);
    await queryRunner.query(
      'ALTER TABLE skills ALTER COLUMN normalized_name SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE skills DROP CONSTRAINT IF EXISTS "UQ_4c13b20c5a17db0e524e20a837d"',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_skills_normalized_name" ON skills (normalized_name)',
    );
    await queryRunner.query(`
      DO $$
      DECLARE constraint_name text;
      BEGIN
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conrelid = 'project_labels'::regclass AND contype = 'u';
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE project_labels DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$
    `);
    await queryRunner.query(`
      UPDATE project_labels
      SET normalized_name = unaccent(lower(regexp_replace(trim(name), '\\s+', ' ', 'g')))
    `);
    await queryRunner.query(`
      DELETE FROM project_label_assignments duplicate
      USING project_label_assignments canonical,
            project_labels duplicate_label,
            project_labels canonical_label
      WHERE duplicate.label_id = duplicate_label.id
        AND canonical.label_id = canonical_label.id
        AND duplicate.project_id = canonical.project_id
        AND duplicate_label.normalized_name = canonical_label.normalized_name
        AND duplicate_label.id > canonical_label.id
    `);
    await queryRunner.query(`
      UPDATE project_label_assignments assignment
      SET label_id = canonical.id
      FROM project_labels duplicate, project_labels canonical
      WHERE assignment.label_id = duplicate.id
        AND duplicate.normalized_name = canonical.normalized_name
        AND duplicate.id > canonical.id
    `);
    await queryRunner.query(`
      DELETE FROM project_labels duplicate
      USING project_labels canonical
      WHERE duplicate.normalized_name = canonical.normalized_name
        AND duplicate.id > canonical.id
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_project_labels_normalized_name" ON project_labels (normalized_name)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_project_labels_normalized_name"');
    await queryRunner.query(
      'ALTER TABLE project_labels ADD CONSTRAINT "UQ_project_labels_normalized_name" UNIQUE (normalized_name)',
    );
    await queryRunner.query('DROP INDEX "IDX_skills_normalized_name"');
    await queryRunner.query('ALTER TABLE skills DROP COLUMN normalized_name');
    await queryRunner.query(
      'ALTER TABLE skills ADD CONSTRAINT "UQ_skills_name" UNIQUE (name)',
    );
  }
}
