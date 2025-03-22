# Package @wspro/knex-postgres

## Getting started

```
npm i @wspro/knex-postgres
```

## Use migration methods

*migrations.js*

```
const {
  GrantLevels,
  migrateLatest,
  migrateDown,
  migrateUp,
} = require('@wspro/knex-postgres');

// см. тип KnexConfig в пакете
function getConnectionConfig() {
  return { client: 'pg', connection: { ... } };
}

// см. тип MigratorConfig в пакете
function getMigrationConfig() {
  // пользовательские роли
  const roleConfigs = [
    { username: '...', password: '...', grantLevel: GrantLevels.All },
    { username: '...', password: '...', grantLevel: GrantLevels.Write },
    { username: '...', password: '...', grantLevel: GrantLevels.Read },
    { username: '...', password: '...', grantLevel: GrantLevels.Lock },
  ]

  return { ..., roleConfigs };
}

async function migrate() {
  const connectionConfig = getConnectionConfig();
  const migrationConfig = getMigrationConfig();

  try {
    switch (process.argv[2]) {
      case 'up':
        await migrateUp(connectionConfig, migrationConfig);
        break;
      case 'latest':
        await migrateLatest(connectionConfig, migrationConfig);
        break;
      case 'down':
        await migrateDown(connectionConfig, migrationConfig);
        break;
      default:
        throw new Error('Unknown operation');
    }
  } catch (error) {
    console.error(error);

    process.exit(1);
  }

  process.exit(0);
}

migrate();
```

*package.json*

```
  ...
  "scripts": {
    ...
    "migrate:down": "node migrations.js down",
    "migrate:latest": "node migrations.js latest",
    "migrate:up": "node migrations.js latest",
    ...
  },
```