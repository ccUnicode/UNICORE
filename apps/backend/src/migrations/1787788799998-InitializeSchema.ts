import { MigrationInterface, QueryRunner } from 'typeorm';

// Fixed SQL baseline for installations that previously depended on synchronize.
// Existing installations are upgraded by the subsequent historical migrations.
export class InitializeSchema1787788799998 implements MigrationInterface {
  /** Create a fixed baseline on empty databases; adopt existing member schemas. */
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('members')) return;
    const existing = (await queryRunner.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name <> 'migrations'`,
    )) as unknown[];
    if (existing.length) {
      throw new Error(
        'Initial schema requires an empty database or an existing members table',
      );
    }
    const statements = [
      'CREATE TABLE "areas" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(1000), "isArchived" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8c2ad80240e18fcac9e7c526311" UNIQUE ("name"), CONSTRAINT "PK_5110493f6342f34c978c084d0d6" PRIMARY KEY ("id"))',
      'CREATE TABLE "area_memberships" ("id" SERIAL NOT NULL, "role" character varying(30) NOT NULL DEFAULT \'miembro\', "member_id" integer NOT NULL, "area_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8aaa613d86f2689e20208fc0094" UNIQUE ("member_id", "area_id"), CONSTRAINT "PK_31cb51e2a6ec7451bac7fe8c162" PRIMARY KEY ("id"))',
      'CREATE TABLE "project_labels" ("id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, "normalized_name" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_28436983a02723256a6c833ec53" UNIQUE ("normalized_name"), CONSTRAINT "PK_40b1609f49fe7523fafc69315f0" PRIMARY KEY ("id"))',
      'CREATE TABLE "project_links" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "url" character varying(2048) NOT NULL, "project_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_afff993e1b62a47c2168aff2c56" PRIMARY KEY ("id"))',
      'CREATE TABLE "task_assignees" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "member_id" integer NOT NULL, "project_membership_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0e5589edf393d39fe26c9b6a0c1" UNIQUE ("task_id", "member_id"), CONSTRAINT "PK_e23bc1438f7bb32f41e8d493e78" PRIMARY KEY ("id"))',
      'CREATE INDEX "IDX_task_assignees_member_task" ON "task_assignees" ("member_id", "task_id") ',
      'CREATE TABLE "task_comments" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "author_id" integer NOT NULL, "content" character varying(2000) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_83b99b0b03db29d4cafcb579b77" PRIMARY KEY ("id"))',
      'CREATE INDEX "IDX_task_comments_task_created" ON "task_comments" ("task_id", "created_at") ',
      "CREATE TYPE \"tasks_status_enum\" AS ENUM('todo', 'in_progress', 'in_review', 'done')",
      'CREATE TABLE "task_status_history" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "previous_status" "tasks_status_enum" NOT NULL, "new_status" "tasks_status_enum" NOT NULL, "actor_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_09bb53afe7af0749af25fc2b52d" PRIMARY KEY ("id"))',
      'CREATE INDEX "IDX_task_status_history_task_created" ON "task_status_history" ("task_id", "created_at") ',
      "CREATE TYPE \"tasks_priority_enum\" AS ENUM('low', 'medium', 'high', 'urgent')",
      'CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "description" character varying(2000), "priority" "tasks_priority_enum" NOT NULL DEFAULT \'medium\', "due_date" date, "status" "tasks_status_enum" NOT NULL DEFAULT \'todo\', "project_id" integer NOT NULL, "phase_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))',
      'CREATE TABLE "project_phases" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(2000), "order_index" integer NOT NULL, "project_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_751991724b3ba4af6b5f1ecbea0" PRIMARY KEY ("id"))',
      "CREATE TYPE \"projects_status_enum\" AS ENUM('planned', 'active', 'on_hold', 'completed', 'cancelled')",
      'CREATE TABLE "projects" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(2000), "start_date" date, "end_date" date, "area_id" integer NOT NULL, "status" "projects_status_enum" NOT NULL DEFAULT \'planned\', "is_archived" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))',
      'CREATE TABLE "project_memberships" ("id" SERIAL NOT NULL, "role" character varying(30) NOT NULL DEFAULT \'member\', "member_id" integer NOT NULL, "project_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9d08fc42a8c9796de59fa566862" UNIQUE ("member_id", "project_id"), CONSTRAINT "PK_856d7bae2d9bddc94861d41eded" PRIMARY KEY ("id"))',
      "CREATE TYPE \"members_activity_status_enum\" AS ENUM('active', 'inactive')",
      "CREATE TYPE \"members_availability_status_enum\" AS ENUM('available', 'not_available', 'disabled')",
      'CREATE TABLE "members" ("id" SERIAL NOT NULL, "institution" character varying(120) NOT NULL DEFAULT \'UNI\', "student_code" character varying(20), "first_names" character varying(120) NOT NULL, "last_names" character varying(120) NOT NULL, "major" character varying(120) NOT NULL, "birth_date" date NOT NULL, "cycle" integer, "password_hash" character varying(255), "session_version" integer NOT NULL DEFAULT \'0\', "activity_status" "members_activity_status_enum" NOT NULL DEFAULT \'inactive\', "availability_status" "members_availability_status_enum" NOT NULL DEFAULT \'available\', "disabled_at" TIMESTAMP WITH TIME ZONE, "disabled_access_snapshot" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b018102167752ef779b55ac2e90" UNIQUE ("institution", "student_code"), CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY ("id"))',
      'CREATE TABLE "skills" ("id" SERIAL NOT NULL, "name" character varying(120) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0d3212120f4ecedf90864d7e298" PRIMARY KEY ("id"))',
      'CREATE TABLE "audit_events" ("id" SERIAL NOT NULL, "actor_id" integer NOT NULL, "actor_name" character varying(255) NOT NULL, "actor_role" character varying(50) NOT NULL, "action" character varying(50) NOT NULL, "entity_type" character varying(100) NOT NULL, "entity_id" character varying(50) NOT NULL, "area_id" integer, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "metadata" text, CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"))',
      'CREATE TABLE "project_label_assignments" ("project_id" integer NOT NULL, "label_id" integer NOT NULL, CONSTRAINT "PK_218ecafee41a4c8a85c9917f4ae" PRIMARY KEY ("project_id", "label_id"))',
      'CREATE INDEX "IDX_444faa76293f8ac044654a9439" ON "project_label_assignments" ("project_id") ',
      'CREATE INDEX "IDX_ea07ea2716542b22ffbd814a2d" ON "project_label_assignments" ("label_id") ',
      'CREATE TABLE "members_skills_skills" ("membersId" integer NOT NULL, "skillsId" integer NOT NULL, CONSTRAINT "PK_bc96cbcd2633a3944c89038d55f" PRIMARY KEY ("membersId", "skillsId"))',
      'CREATE INDEX "IDX_68ce544115d062f5469892cc9a" ON "members_skills_skills" ("membersId") ',
      'CREATE INDEX "IDX_1ebada238b2be1c7a1669f8441" ON "members_skills_skills" ("skillsId") ',
      'ALTER TABLE "area_memberships" ADD CONSTRAINT "FK_e33a71bc4c3deea34914211e160" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "area_memberships" ADD CONSTRAINT "FK_20a7c28c48663035e4b036055a9" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "project_links" ADD CONSTRAINT "FK_aa6f941f78f7d57910c42bf3ddc" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "task_assignees" ADD CONSTRAINT "FK_0141288f2306f20da9a60ec8d69" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "task_assignees" ADD CONSTRAINT "FK_0db718349afc9075382dd719f40" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "task_assignees" ADD CONSTRAINT "FK_7222ea8bac041443d005a9b9ae5" FOREIGN KEY ("project_membership_id") REFERENCES "project_memberships"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
      'ALTER TABLE "task_comments" ADD CONSTRAINT "FK_ba9e465cfc707006e60aae59946" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "task_comments" ADD CONSTRAINT "FK_76901a920ba9ec5be8dbd64d747" FOREIGN KEY ("author_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
      'ALTER TABLE "task_status_history" ADD CONSTRAINT "FK_984dd79c26d9f7dfec056068176" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "task_status_history" ADD CONSTRAINT "FK_cb359f43223e7435f9207717946" FOREIGN KEY ("actor_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
      'ALTER TABLE "tasks" ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "tasks" ADD CONSTRAINT "FK_9df310e6687970816f92aa5c60a" FOREIGN KEY ("phase_id") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
      'ALTER TABLE "project_phases" ADD CONSTRAINT "FK_e5b4414fb3d4c04cf6012705987" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "projects" ADD CONSTRAINT "FK_81f0274aec36885e20d9ec9fe8b" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
      'ALTER TABLE "project_memberships" ADD CONSTRAINT "FK_6274bb3ce7e702bc37c99b2f40f" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "project_memberships" ADD CONSTRAINT "FK_38a73cbcc58fbed8e62a66d79b8" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
      'ALTER TABLE "project_label_assignments" ADD CONSTRAINT "FK_444faa76293f8ac044654a94399" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE "project_label_assignments" ADD CONSTRAINT "FK_ea07ea2716542b22ffbd814a2da" FOREIGN KEY ("label_id") REFERENCES "project_labels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
      'ALTER TABLE "members_skills_skills" ADD CONSTRAINT "FK_68ce544115d062f5469892cc9a9" FOREIGN KEY ("membersId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE',
      'ALTER TABLE "members_skills_skills" ADD CONSTRAINT "FK_1ebada238b2be1c7a1669f8441b" FOREIGN KEY ("skillsId") REFERENCES "skills"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    ];
    for (const sql of statements) await queryRunner.query(sql);
  }

  /** Refuse destructive rollback because existing installations may be adopted. */
  down(): Promise<void> {
    // This baseline can adopt an existing database. Never delete its data on rollback.
    return Promise.reject(
      new Error(
        'The initial schema cannot be rolled back automatically; restore a backup',
      ),
    );
  }
}
