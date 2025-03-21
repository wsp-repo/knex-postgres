import { knexFactory } from './factory';

import { CreatorUser, KnexConfig } from '../types';

import { getConnectionConfig } from './config';

/**
 * Этап создания базы данных
 */
async function createDatabaseIfNotExists(
  config: KnexConfig,
  creator?: CreatorUser,
): Promise<void> {
  const { connection: connectionConfig, ...otherConfig } = config;

  const { database = '', ...connection } = getConnectionConfig({
    ...connectionConfig,
    ...creator,
  });
  const knex = knexFactory({ ...otherConfig, connection });

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
  config: KnexConfig,
  creator?: CreatorUser,
): Promise<void> {
  const { connection: connectionConfig, ...otherConfig } = config;

  const { schema = 'public', ...connection } = getConnectionConfig({
    ...connectionConfig,
    ...creator,
  });
  const knex = knexFactory({ ...otherConfig, connection });

  await knex.raw('CREATE SCHEMA IF NOT EXISTS ??;', [schema]);
  await knex.destroy();
}

/**
 * Этап создания пользователя с правами
 */
async function createUserIfNotExists(
  config: KnexConfig,
  creator?: CreatorUser,
): Promise<void> {
  const { connection: connectionConfig, ...otherConfig } = config;

  const {
    database = '',
    user = '',
    password = '',
  } = getConnectionConfig(connectionConfig);
  const connection = getConnectionConfig({
    ...connectionConfig,
    ...creator,
  });

  const knex = knexFactory({ ...otherConfig, connection });

  try {
    await knex.raw('CREATE ROLE ?? LOGIN PASSWORD ?;', [user, password]);
  } catch (error) {
    console.warn(`Create role error: ${error.message}`);
  }

  try {
    await knex.raw('GRANT ALL PRIVILEGES ON DATABASE ?? TO ??;', [
      database,
      user,
    ]);
  } catch (error) {
    console.warn(`Grant privileges error: ${error.message}`);
  }

  await knex.destroy();
}

/**
 * Выполняет подготовку базы данных
 */
export async function prepareDatabase(
  connectionConfig: KnexConfig,
  creator?: CreatorUser,
): Promise<void> {
  await createDatabaseIfNotExists(connectionConfig, creator);
  await createSchemaIfNotExists(connectionConfig, creator);
  await createUserIfNotExists(connectionConfig, creator);
}
