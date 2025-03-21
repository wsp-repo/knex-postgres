import { knexFactory, prepareDatabase } from './helpers';

import { KnexConfig, MigratorConfig } from './types';

export async function migrateUp(
  connectionConfig: KnexConfig,
  migrationConfig: MigratorConfig,
): Promise<void> {
  await prepareDatabase(connectionConfig, migrationConfig?.creator);

  await knexFactory(connectionConfig).migrate.up(migrationConfig);
}

export async function migrateLatest(
  connectionConfig: KnexConfig,
  migrationConfig: MigratorConfig,
): Promise<void> {
  await prepareDatabase(connectionConfig, migrationConfig?.creator);

  await knexFactory(connectionConfig).migrate.latest(migrationConfig);
}

export async function migrateDown(
  connectionConfig: KnexConfig,
  migrationConfig: MigratorConfig,
): Promise<void> {
  await knexFactory(connectionConfig).migrate.down(migrationConfig);
}
