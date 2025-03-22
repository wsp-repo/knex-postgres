# Package @wspro/knex-postgres

## Getting started

```
npm i @wspro/knex-postgres
```

## Use migration methods

*migrations.js*

```
const {
  AccessLevels,
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
  const roles = {
    username1: { password: '...', access: [AccessLevels.Full] },
    username2: { password: '...', access: [AccessLevels.Write] },
    username3: { password: '...', access: [AccessLevels.Read] },
    username4: { password: '...', access: [AccessLevels.Lock] },
  };

  return { ..., roles };
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