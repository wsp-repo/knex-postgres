import { getClientConfig, knexFactory } from '../factory';
import { prepareDatabase } from './database';
import { prepareUsers } from './users';

import { MigratorConfig } from '../../common/types';
import { PgKnexConfig } from '../types';

export async function migrateUp(
  knexConfig: PgKnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  const clientConfig = getClientConfig(knexConfig);

  await prepareDatabase(clientConfig, migratorConfig);
  await prepareUsers(clientConfig, migratorConfig);

  const knexClient = knexFactory(clientConfig);

  await knexClient.migrate.up(migratorConfig);
}

export async function migrateLatest(
  knexConfig: PgKnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  const clientConfig = getClientConfig(knexConfig);

  await prepareDatabase(clientConfig, migratorConfig);
  await prepareUsers(clientConfig, migratorConfig);

  const knexClient = knexFactory(clientConfig);

  await knexClient.migrate.latest(migratorConfig);
}

export async function migrateDown(
  knexConfig: PgKnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  const clientConfig = getClientConfig(knexConfig);
  const knexClient = knexFactory(clientConfig);

  await knexClient.migrate.down(migratorConfig);
}
