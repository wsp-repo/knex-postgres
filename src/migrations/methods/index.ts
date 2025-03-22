import { prepareDatabase } from '../helpers/before';
import { knexFactory } from '../helpers/factory';

import { KnexConfig, MigratorConfig } from '../types';

export async function migrateUp(
  knexConfig: KnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  await prepareDatabase(knexConfig, migratorConfig);

  await knexFactory(knexConfig).migrate.up(migratorConfig);
}

export async function migrateLatest(
  knexConfig: KnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  await prepareDatabase(knexConfig, migratorConfig);

  await knexFactory(knexConfig).migrate.latest(migratorConfig);
}

export async function migrateDown(
  knexConfig: KnexConfig,
  migratorConfig: MigratorConfig,
): Promise<void> {
  await knexFactory(knexConfig).migrate.down(migratorConfig);
}
