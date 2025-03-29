import { Knex } from 'knex';

import { rawQuery } from '../../common/helpers';
import { knexFactory } from '../factory';

import { MigratorConfig, UserConfig, UserLevels } from '../../common/types';

import { PgClientConfig } from '../types/configs';

type RoleConfig = UserConfig & {
  database: string;
  schema?: string;
};

const ENTITIES = ['TABLES', 'SEQUENCES', 'FUNCTIONS'];

/**
 * Создает безопасную функцию-хелпер для выполнения RAW-запроса
 */
function createSafeRawExecutor(
  knex: Knex,
  binds: unknown[],
): (sqlString: string) => Promise<void> {
  return async (sqlString: string) => {
    await rawQuery(knex, sqlString, binds).catch((error: Error) =>
      console.warn(`Error ${sqlString}: ${error.message}`),
    );
  };
}

/**
 * Создает роль и задает указанный пароль
 */
async function createRoleIfNotExists(
  knex: Knex,
  role: RoleConfig,
): Promise<void> {
  const { password, username } = role;

  try {
    await rawQuery(knex, 'CREATE ROLE ?? LOGIN PASSWORD ?;', [
      username,
      password,
    ]);
  } catch (error) {
    console.warn(`Create role error: ${error.message}`);
  }

  try {
    await rawQuery(knex, 'ALTER USER ?? WITH PASSWORD ?;', [
      username,
      password,
    ]);
  } catch (error) {
    console.warn(`Alter password error: ${error.message}`);
  }
}

/**
 * Отзывает у роли все права на схему
 */
async function revokeRoleAllPrivileges(
  knex: Knex,
  role: RoleConfig,
): Promise<void> {
  const execQuery = createSafeRawExecutor(knex, [role.schema, role.username]);

  for (const entity of ENTITIES) {
    await execQuery(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ?? REVOKE ALL PRIVILEGES ON ${entity} FROM ?? CASCADE;`,
    );
    await execQuery(
      `REVOKE ALL PRIVILEGES ON ALL ${entity} IN SCHEMA ?? FROM ?? CASCADE;`,
    );
  }

  await execQuery('REVOKE ALL PRIVILEGES ON SCHEMA ?? FROM ?? CASCADE;');
}

/**
 * Назначает роли полные права на схему
 */
async function grantRoleFullPrivileges(
  knex: Knex,
  role: RoleConfig,
): Promise<void> {
  const execQuery = createSafeRawExecutor(knex, [role.schema, role.username]);

  await execQuery('GRANT ALL ON SCHEMA ?? TO ?? WITH GRANT OPTION;');

  for (const entity of ENTITIES) {
    await execQuery(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT ALL ON ${entity} TO ?? WITH GRANT OPTION;`,
    );
    await execQuery(
      `GRANT ALL ON ALL ${entity} IN SCHEMA ?? TO ?? WITH GRANT OPTION;`,
    );
  }
}

/**
 * Назначает роли базовые права на служебные сущности схемы
 */
async function grantRoleBasePrivileges(
  knex: Knex,
  role: RoleConfig,
): Promise<void> {
  const execQuery = createSafeRawExecutor(knex, [role.schema, role.username]);

  await execQuery(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT SELECT, USAGE ON SEQUENCES TO ??;',
  );
  await execQuery(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT EXECUTE ON FUNCTIONS TO ??;',
  );

  await execQuery('GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA ?? TO ??;');
  await execQuery('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ?? TO ??;');
}

/**
 * Назначает права на изменение данных в таблицах схемы
 */
async function grantRoleWritePrivileges(
  knex: Knex,
  role: RoleConfig,
): Promise<void> {
  const execQuery = createSafeRawExecutor(knex, [role.schema, role.username]);

  await grantRoleBasePrivileges(knex, role);

  await execQuery(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO ??;',
  );
  await execQuery(
    'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ?? TO ??;',
  );
}

/**
 * Назначает права на чтение данных из таблиц схемы
 */
async function grantRoleReadPrivileges(
  knex: Knex,
  role: RoleConfig,
): Promise<void> {
  const execQuery = createSafeRawExecutor(knex, [role.schema, role.username]);

  await grantRoleBasePrivileges(knex, role);

  await execQuery(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT SELECT ON TABLES TO ??;',
  );
  await execQuery('GRANT SELECT ON ALL TABLES IN SCHEMA ?? TO ??;');
}

/**
 * Обновляет полномочия роли
 */
async function updateRolePrivileges(
  knex: Knex,
  role: RoleConfig,
): Promise<void> {
  await revokeRoleAllPrivileges(knex, role);

  switch (role.level) {
    case UserLevels.Full:
      await grantRoleFullPrivileges(knex, role);
      break;
    case UserLevels.Write:
      await grantRoleWritePrivileges(knex, role);
      break;
    case UserLevels.Read:
      await grantRoleReadPrivileges(knex, role);
      break;
  }
}

/**
 * Проводит подготовку пользователей
 */
export async function prepareUsers(
  clientConfig: PgClientConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  const { users } = migratorConfig;
  const { database, user } = clientConfig.connection;
  const schema = migratorConfig.schemaName;

  if (!database) throw new Error('Empty database');

  if (!users?.length) return;

  const knex = knexFactory(clientConfig);
  const roles = users.map((userItem) => {
    return { ...userItem, database, schema };
  });

  await Promise.all(
    roles.map(async (role) => {
      // изменять роль текущего подключения нельзя
      if (user === role.username) return;

      await createRoleIfNotExists(knex, role);
      await updateRolePrivileges(knex, role);
    }),
  );

  await knex.destroy();
}
