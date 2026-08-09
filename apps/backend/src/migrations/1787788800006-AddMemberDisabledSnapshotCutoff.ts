import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMemberDisabledSnapshotCutoff1787788800006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('members'))) return;
    if (!(await queryRunner.hasColumn('members', 'disabled_at'))) {
      await queryRunner.addColumn(
        'members',
        new TableColumn({
          name: 'disabled_at',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }
    await queryRunner.query(`
      UPDATE members
      SET disabled_at = updated_at
      WHERE availability_status::text = 'disabled' AND disabled_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('members', 'disabled_at')) {
      await queryRunner.dropColumn('members', 'disabled_at');
    }
  }
}
