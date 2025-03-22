import { Knex } from 'knex';

import { knexFactory } from './factory';

import { AccessLevels, KnexConfig, MigratorConfig, RoleConfig } from '../types';

import { getConnectionConfig } from './config';

type PreparedRole = {
  database: string;
  access: AccessLevels[];
  password: string;
  schema?: string;
  username: string;
};

/**
 * Обертка для выполнения RAW запросов (биндинг местами страдает)
 */
function rawQuery(knex: Knex, sql: string, binds: Knex.RawBinding): Knex.Raw {
  return knex.raw(knex.raw(sql, binds).toQuery());
}

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
    .where('datname', database)
    .first('*');

  if (!dbData) await rawQuery(knex, 'CREATE DATABASE ??;', [database]);

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

  await rawQuery(knex, 'CREATE SCHEMA IF NOT EXISTS ??;', [schemaName]);

  await knex.destroy();
}

/**
 * Подготавливает ролевые права
 */
function prepareRoleConfigs(
  roles: Record<string, RoleConfig>,
  database: string,
  schema?: string,
): PreparedRole[] {
  return Object.entries(roles).map(([username, { password, access }]) => {
    const localAccess = access.includes(AccessLevels.All)
      ? [AccessLevels.All]
      : [...access];

    const setAccess = new Set(localAccess);

    if (setAccess.has(AccessLevels.Write)) {
      setAccess.delete(AccessLevels.Read);
    }

    return {
      access: [...setAccess],
      database,
      password,
      schema,
      username,
    };
  });
}

/**
 * Создает пользователя и задает указанный пароль
 */
async function createRoleIfNotExists(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  try {
    await rawQuery(knex, 'CREATE ROLE ?? LOGIN PASSWORD ?;', [
      roleConfig.username,
      roleConfig.password,
    ]);
  } catch (error) {
    console.warn(`Create role error: ${error.message}`);
  }

  try {
    await rawQuery(knex, 'ALTER USER ?? WITH PASSWORD ?;', [
      roleConfig.username,
      roleConfig.password,
    ]);
  } catch (error) {
    console.warn(`Alter password error: ${error.message}`);
  }
}

/**
 * Этап создания пользователя с правами
 */
async function revokeRoleAllPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const runQuery = (sql: string): Knex.Raw =>
    rawQuery(knex, sql, [roleConfig.schema, roleConfig.username]);

  try {
    await runQuery('REVOKE ALL PRIVILEGES ON SCHEMA ?? FROM ?? CASCADE;');

    await runQuery(
      'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA ?? FROM ?? CASCADE;',
    );
    await runQuery(
      'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA ?? FROM ?? CASCADE;',
    );
    await runQuery(
      'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ?? FROM ?? CASCADE;',
    );

    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? REVOKE ALL PRIVILEGES ON TABLES FROM ?? CASCADE;',
    );
    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? REVOKE ALL PRIVILEGES ON FUNCTIONS FROM ?? CASCADE;',
    );
    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? REVOKE ALL PRIVILEGES ON SEQUENCES FROM ?? CASCADE;',
    );
  } catch (error) {
    console.warn(
      `Error revokeRoleAllPrivileges(${roleConfig.username}): ${error.message}`,
    );
  }
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleAllPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const runQuery = (sql: string): Knex.Raw =>
    rawQuery(knex, sql, [roleConfig.schema, roleConfig.username]);

  try {
    await runQuery('GRANT ALL ON SCHEMA ?? TO ?? WITH GRANT OPTION;');

    await runQuery(
      'GRANT ALL ON ALL TABLES IN SCHEMA ?? TO ?? WITH GRANT OPTION;',
    );
    await runQuery(
      'GRANT ALL ON ALL FUNCTIONS IN SCHEMA ?? TO ?? WITH GRANT OPTION;',
    );
    await runQuery(
      'GRANT ALL ON ALL SEQUENCES IN SCHEMA ?? TO ?? WITH GRANT OPTION;',
    );

    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT ALL ON TABLES TO ?? WITH GRANT OPTION;',
    );
    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT ALL ON FUNCTIONS TO ?? WITH GRANT OPTION;',
    );
    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT ALL ON SEQUENCES TO ?? WITH GRANT OPTION;',
    );
  } catch (error) {
    console.warn(
      `Error grantRoleAllPrivileges(${roleConfig.username}): ${error.message}`,
    );
  }
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleLockPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const runQuery = (sql: string): Knex.Raw =>
    rawQuery(knex, sql, [roleConfig.schema, roleConfig.username]);

  try {
    await runQuery('GRANT MAINTAIN ON ALL TABLES IN SCHEMA ?? TO ??;');

    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT MAINTAIN ON TABLES TO ??;',
    );
  } catch (error) {
    console.warn(
      `Error grantRoleLockPrivileges(${roleConfig.username}): ${error.message}`,
    );
  }
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleBasePrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const runQuery = (sql: string): Knex.Raw =>
    rawQuery(knex, sql, [roleConfig.schema, roleConfig.username]);

  try {
    await runQuery('GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA ?? TO ??;');
    await runQuery('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ?? TO ??;');
    await runQuery('GRANT EXECUTE ON ALL PROCEDURE IN SCHEMA ?? TO ??;');

    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT SELECT, USAGE ON SEQUENCES TO ??;',
    );
    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT EXECUTE ON FUNCTIONS TO ??;',
    );
    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT EXECUTE ON PROCEDURE TO ??;',
    );
  } catch (error) {
    console.warn(
      `Error grantRoleCommonPrivileges(${roleConfig.username}): ${error.message}`,
    );
  }
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleWritePrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const runQuery = (sql: string): Knex.Raw =>
    rawQuery(knex, sql, [roleConfig.schema, roleConfig.username]);

  try {
    await grantRoleBasePrivileges(knex, roleConfig);

    await runQuery(
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ?? TO ??;',
    );

    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO ??;',
    );
  } catch (error) {
    console.warn(
      `Error grantRoleWritePrivileges(${roleConfig.username}): ${error.message}`,
    );
  }
}

/**
 * Этап создания пользователя с правами
 */
async function grantRoleReadPrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  const runQuery = (sql: string): Knex.Raw =>
    rawQuery(knex, sql, [roleConfig.schema, roleConfig.username]);

  try {
    await grantRoleBasePrivileges(knex, roleConfig);

    await runQuery('GRANT SELECT ON ALL TABLES IN SCHEMA ?? TO ??;');

    await runQuery(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT SELECT ON TABLES TO ??;',
    );
  } catch (error) {
    console.warn(
      `Error grantRoleReadPrivileges(${roleConfig.username}): ${error.message}`,
    );
  }
}

/**
 * Этап создания пользователя с правами
 */
async function updateRolePrivileges(
  knex: Knex,
  roleConfig: PreparedRole,
): Promise<void> {
  await revokeRoleAllPrivileges(knex, roleConfig);

  for (const access of roleConfig.access) {
    switch (access) {
      case AccessLevels.All:
        await grantRoleAllPrivileges(knex, roleConfig);
        break;
      case AccessLevels.Lock:
        await grantRoleLockPrivileges(knex, roleConfig);
        break;
      case AccessLevels.Write:
        await grantRoleWritePrivileges(knex, roleConfig);
        break;
      case AccessLevels.Read:
        await grantRoleReadPrivileges(knex, roleConfig);
        break;
    }
  }
}

/**
 * Этап создания пользователей с правами
 */
async function createRolesIfNotExists(
  knexConfig: KnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  /* prettier-ignore */
  const roles = migratorConfig.roles
    ? Object.keys(migratorConfig.roles)
    : [];

  if (roles.length === 0) return;

  const connection = getConnectionConfig(knexConfig.connection);

  if (!connection.database) throw new Error('Empty database');

  const knex = knexFactory({ ...knexConfig, connection });
  const roleConfigs = prepareRoleConfigs(
    migratorConfig.roles,
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
      await updateRolePrivileges(knex, roleConfig);
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
