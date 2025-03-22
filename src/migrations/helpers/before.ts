import { Knex } from 'knex';

import { knexFactory } from './factory';

import { GrantLevels, KnexConfig, MigratorConfig, RoleConfig } from '../types';

import { getConnectionConfig } from './config';

type PreparedRole = {
  database: string;
  grants: GrantLevels[];
  password: string;
  schema?: string;
  username: string;
};

/**
 * Этап создания базы данных
 */
async function createDatabaseIfNotExists(
  knexConfig: KnexConfig,
): Promise<void> {
  const { database, ...connection } = getConnectionConfig(
    knexConfig.connection,
  );

  if (!database) throw new Error('Empty database');

  const knex = knexFactory({ ...knexConfig, connection });

  const dbData = await knex('pg_catalog.pg_database')
    .whereRaw('lower(??) = lower(?)', ['dbname', database])
    .first('*');

  if (!dbData) await knex.raw('CREATE DATABASE ??;', [database]);

  await knex.destroy();
}

/**
 * Этап создания схемы в базе данных
 */
async function createSchemaIfNotExists(
  knexConfig: KnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  if (!migratorConfig.schemaName) return;

  const { schemaName } = migratorConfig;

  const connection = getConnectionConfig(knexConfig.connection);
  const knex = knexFactory({ ...knexConfig, connection });

  await knex.raw('CREATE SCHEMA IF NOT EXISTS ??;', [schemaName]);
  await knex.destroy();
}

/**
 * Подготавливает ролевые права
 */
function prepareRoleConfigs(
  roleConfigs: RoleConfig[],
  database: string,
  schema?: string,
): PreparedRole[] {
  const rolesHash = roleConfigs.reduce(
    (memo, role) => {
      const { grantLevel, username, password } = role;

      const createRole = memo[username] || {
        database,
        grants: [],
        password,
        schema,
        username,
      };

      createRole.grants.push(grantLevel);

      memo[username] = createRole;

      return memo;
    },
    {} as Record<string, PreparedRole>,
  );

  // нужно "подчистить" набор прав ролей
  return Object.values(rolesHash).map(({ grants, ...other }) => {
    if (grants.includes(GrantLevels.All)) {
      return { ...other, grants: [GrantLevels.All] };
    }

    const setGrants = new Set(grants);

    if (setGrants.has(GrantLevels.Write)) {
      setGrants.delete(GrantLevels.Read);
    }

    return { ...other, grants: [...setGrants] };
  });
}

/**
 * Создает пользователя и задает указанный пароль
 */
async function createRoleIfNotExists(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const { username, password } = roleConfig;

  try {
    await knex.raw('CREATE ROLE ?? LOGIN PASSWORD ?;', [username, password]);
  } catch (error) {
    console.warn(`Create role error: ${error.message}`);
  }

  try {
    await knex.raw('ALTER USER ?? WITH PASSWORD ?;', [username, password]);
  } catch (error) {
    console.warn(`Alter password error: ${error.message}`);
  }
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleClearPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  await knex.raw('REVOKE ALL PRIVILEGES ON SCHEMA ?? FROM ?? CASCADE;', [
    roleConfig.schema,
    roleConfig.username,
  ]);
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleAllPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  await knex.raw('GRANT ALL PRIVILEGES ON SCHEMA ?? TO ??;', [
    roleConfig.schema,
    roleConfig.username,
  ]);
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleLockPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  await knex.raw('GRANT MAINTAIN ON ALL TABLES IN SCHEMA ?? TO ??;', [
    roleConfig.schema,
    roleConfig.username,
  ]);
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleCommonPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const bindsForGrant = [roleConfig.schema, roleConfig.username];

  await knex.raw(
    'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ?? TO ??;',
    bindsForGrant,
  );
  await knex.raw(
    'GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA ?? TO ??;',
    bindsForGrant,
  );
  await knex.raw(
    'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ?? TO ??;',
    bindsForGrant,
  );
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleWritePrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  await knex.raw(
    'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ?? TO ??;',
    [roleConfig.schema, roleConfig.username],
  );
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleReadPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  await knex.raw('GRANT SELECT ON ALL TABLES IN SCHEMA ?? TO ??;', [
    roleConfig.schema,
    roleConfig.username,
  ]);
}

/**
 * Этап создания пользователя с правами
 */
async function grantRolePrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  try {
    await grantRoleClearPrivileges(knex, roleConfig);

    for (const grantLevel of roleConfig.grants) {
      switch (grantLevel) {
        case GrantLevels.All:
          await grantRoleAllPrivileges(knex, roleConfig);
          break;
        case GrantLevels.Lock:
          await grantRoleLockPrivileges(knex, roleConfig);
          break;
        case GrantLevels.Write:
          await grantRoleCommonPrivileges(knex, roleConfig);
          await grantRoleWritePrivileges(knex, roleConfig);
          break;
        case GrantLevels.Read:
          await grantRoleCommonPrivileges(knex, roleConfig);
          await grantRoleReadPrivileges(knex, roleConfig);
          break;
      }
    }
  } catch (error) {
    console.warn(`Grant privileges error: ${error.message}`);
  }
}

/**
 * Этап создания пользователей с правами
 */
async function createRolesIfNotExists(
  knexConfig: KnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  if (!migratorConfig.roleConfigs?.length) return;

  const connection = getConnectionConfig(knexConfig.connection);

  if (!connection.database) throw new Error('Empty database');

  const knex = knexFactory({ ...knexConfig, connection });
  const roleConfigs = prepareRoleConfigs(
    migratorConfig.roleConfigs,
    connection.database,
    migratorConfig.schemaName,
  );

  await Promise.all(
    roleConfigs.map(async (roleConfig) => {
      // изменять роль текущего подключения нельзя
      if (connection.user === roleConfig.username) {
        return;
      }

      await createRoleIfNotExists(knex, roleConfig);
      await grantRolePrivileges(knex, roleConfig);
    }),
  );

  await knex.destroy();
}

/**
 * Выполняет подготовку базы данных
 */
export async function prepareDatabase(
  knexConfig: KnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  await createDatabaseIfNotExists(knexConfig);
  await createSchemaIfNotExists(knexConfig, migratorConfig);
  await createRolesIfNotExists(knexConfig, migratorConfig);
}
