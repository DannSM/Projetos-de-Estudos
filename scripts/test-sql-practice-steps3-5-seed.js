const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PGlite } = require("@electric-sql/pglite");

const seedPath = path.join(__dirname, "..", "docs", "supabase-sql-practice-steps3-5.sql");
const seedFile = fs.readFileSync(seedPath, "utf8");
const transactionEnd = seedFile.indexOf("\ncommit;");

if (transactionEnd < 0) {
  throw new Error("O seed das Etapas 3 a 5 nao possui commit explicito.");
}

const seedSql = seedFile.slice(0, transactionEnd + "\ncommit;".length);

async function run() {
  const db = new PGlite("memory://");
  await db.waitReady;

  try {
    await db.exec(`
      create table learning_activities (
        id serial primary key,
        slug text not null unique,
        activity_type text not null,
        title text not null,
        subtitle text,
        track_slug text,
        track_title text,
        step_order integer,
        status text,
        level_label text,
        estimated_minutes integer,
        is_active boolean,
        metadata jsonb,
        updated_at timestamptz default now()
      );

      create table sql_datasets (
        id serial primary key,
        slug text not null unique,
        title text not null,
        description text,
        engine text not null default 'postgresql',
        schema_config jsonb not null,
        seed_data jsonb not null,
        sample_rows jsonb not null,
        is_active boolean,
        updated_at timestamptz default now()
      );

      create table sql_practice_exercises (
        id serial primary key,
        activity_id integer not null unique references learning_activities(id),
        dataset_id integer not null references sql_datasets(id),
        prompt text not null,
        objective text,
        theoretical_support jsonb not null,
        validation_config jsonb not null,
        expected_result jsonb not null,
        solution_sql text not null,
        is_active boolean,
        updated_at timestamptz default now()
      );

      insert into learning_activities (
        slug, activity_type, title, subtitle, track_slug, track_title,
        step_order, status, level_label, estimated_minutes, is_active, metadata
      )
      values
        ('sql-essencial-filtros-where', 'practice', 'Etapa 1', 'Etapa 1', 'sql-essencial', 'SQL Essencial', 1, 'active', 'SQL Junior', 15, true, '{}'::jsonb),
        ('sql-essencial-count-nulos-distintos', 'practice', 'Etapa 2', 'Etapa 2', 'sql-essencial', 'SQL Essencial', 2, 'active', 'SQL Junior', 12, true, '{}'::jsonb);

      insert into sql_datasets (
        slug, title, description, engine, schema_config, seed_data, sample_rows, is_active
      )
      values (
        'pedidos-sinteticos-v1',
        'Pedidos sinteticos',
        'Dataset existente',
        'postgresql',
        '{"table":"pedidos","columns":[]}'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        true
      );
    `);

    await db.exec(seedSql);
    await db.exec(seedSql);

    const activities = await db.query(`
      select slug, status, step_order
      from learning_activities
      order by step_order
    `);
    assert.strictEqual(activities.rows.length, 5);
    assert.deepStrictEqual(
      activities.rows.slice(2).map((row) => [row.slug, row.status, row.step_order]),
      [
        ["sql-essencial-filtro-antes-agregacao", "active", 3],
        ["sql-essencial-group-by", "active", 4],
        ["sql-essencial-join", "active", 5]
      ]
    );

    const datasets = await db.query("select slug from sql_datasets order by slug");
    assert.deepStrictEqual(
      datasets.rows.map((row) => row.slug),
      ["pedidos-clientes-join-v1", "pedidos-sinteticos-v1"]
    );

    const exercises = await db.query(`
      select activity.slug, dataset.slug as dataset_slug,
        exercise.validation_config ->> 'validator' as validator
      from sql_practice_exercises exercise
      join learning_activities activity on activity.id = exercise.activity_id
      join sql_datasets dataset on dataset.id = exercise.dataset_id
      order by activity.step_order
    `);
    assert.deepStrictEqual(
      exercises.rows.map((row) => [row.slug, row.dataset_slug, row.validator]),
      [
        ["sql-essencial-filtro-antes-agregacao", "pedidos-sinteticos-v1", "paid_orders_summary"],
        ["sql-essencial-group-by", "pedidos-sinteticos-v1", "orders_by_category_summary"],
        ["sql-essencial-join", "pedidos-clientes-join-v1", "paid_orders_with_customers"]
      ]
    );

    const protectedActivities = await db.query(`
      select slug, title
      from learning_activities
      where step_order in (1, 2)
      order by step_order
    `);
    assert.deepStrictEqual(
      protectedActivities.rows.map((row) => [row.slug, row.title]),
      [
        ["sql-essencial-filtros-where", "Etapa 1"],
        ["sql-essencial-count-nulos-distintos", "Etapa 2"]
      ]
    );
  } finally {
    await db.close();
  }

  console.log("SQL practice steps 3-5 seed tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
