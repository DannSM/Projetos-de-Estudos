const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PGlite } = require("@electric-sql/pglite");

const seedPath = path.join(__dirname, "..", "docs", "supabase-sql-essential-progress-5-steps.sql");
const seedFile = fs.readFileSync(seedPath, "utf8");
const transactionEnd = seedFile.indexOf("\ncommit;");

if (transactionEnd < 0) {
  throw new Error("O seed de progresso SQL Essencial nao possui commit explicito.");
}

const seedSql = seedFile.slice(0, transactionEnd + "\ncommit;".length);

async function run() {
  const db = new PGlite("memory://");
  await db.waitReady;

  try {
    await db.exec(`
      create schema if not exists public;

      create table public.learning_paths (
        id text primary key,
        slug text not null unique,
        title text not null
      );

      create table public.learning_path_steps (
        id serial primary key,
        path_id text not null references public.learning_paths(id),
        step_key text,
        title text not null,
        description text,
        skill_area text,
        content_type text,
        content_url text,
        display_order integer not null,
        estimated_minutes integer,
        status text not null,
        metadata jsonb,
        updated_at timestamptz default now()
      );

      create unique index learning_path_steps_path_step_key_unique
        on public.learning_path_steps (path_id, step_key)
        where step_key is not null;

      insert into public.learning_paths (id, slug, title)
      values
        ('path-sql', 'sql-essencial', 'SQL Essencial'),
        ('path-other', 'estatistica-essencial', 'Estatistica Essencial');

      insert into public.learning_path_steps (
        path_id, step_key, title, description, skill_area, content_type,
        display_order, estimated_minutes, status, metadata
      )
      values
        (
          'path-sql', 'sql-essencial-01-where', 'Filtros com WHERE', 'Etapa 1',
          'SQL', 'practice', 1, 15, 'active',
          '{"source":"learning_path_catalog_v1","recommendation_key":"sql-where"}'::jsonb
        ),
        (
          'path-sql', 'sql-essencial-02-contagens', 'Contagens e nulos', 'Etapa 2',
          'SQL', 'practice', 2, 12, 'active',
          '{"source":"learning_path_catalog_v1","recommendation_key":"sql-count"}'::jsonb
        ),
        (
          'path-sql', 'sql-essencial-03-filtro-mais-agregacao', 'Filtro antes do resumo', 'Etapa 3',
          'SQL', 'practice', 3, 15, 'active', null
        ),
        (
          'path-other', 'estatistica-01', 'Estatistica inicial', 'Outra trilha',
          'Estatistica', 'lesson', 1, 10, 'active', '{"protected":true}'::jsonb
        );
    `);

    await db.exec(seedSql);
    await db.exec(seedSql);

    const sqlSteps = await db.query(`
      select
        step_key,
        display_order,
        status,
        estimated_minutes,
        metadata
      from public.learning_path_steps
      where path_id = 'path-sql'
      order by display_order
    `);

    assert.strictEqual(sqlSteps.rows.length, 5);
    assert.deepStrictEqual(
      sqlSteps.rows.map((row) => [row.step_key, row.display_order, row.status]),
      [
        ["sql-essencial-01-where", 1, "active"],
        ["sql-essencial-02-contagens", 2, "active"],
        ["sql-essencial-03-filtro-mais-agregacao", 3, "active"],
        ["sql-essencial-04-group-by", 4, "active"],
        ["sql-essencial-05-join", 5, "active"]
      ]
    );

    const expectedPracticeSlugs = [
      "sql-essencial-filtros-where",
      "sql-essencial-count-nulos-distintos",
      "sql-essencial-filtro-antes-agregacao",
      "sql-essencial-group-by",
      "sql-essencial-join"
    ];

    assert.deepStrictEqual(
      sqlSteps.rows.map((row) => row.metadata.practice_slug),
      expectedPracticeSlugs
    );
    assert.strictEqual(sqlSteps.rows[0].metadata.source, "learning_path_catalog_v1");
    assert.strictEqual(sqlSteps.rows[0].metadata.recommendation_key, "sql-where");
    assert.strictEqual(sqlSteps.rows[2].metadata.activity_slug, expectedPracticeSlugs[2]);
    assert.strictEqual(sqlSteps.rows[3].estimated_minutes, 18);
    assert.strictEqual(sqlSteps.rows[4].estimated_minutes, 20);

    const otherSteps = await db.query(`
      select step_key, metadata
      from public.learning_path_steps
      where path_id = 'path-other'
    `);
    assert.deepStrictEqual(otherSteps.rows, [
      { step_key: "estatistica-01", metadata: { protected: true } }
    ]);
  } finally {
    await db.close();
  }

  console.log("SQL Essential progress seed tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
