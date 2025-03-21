import createKnexClient, { Knex } from 'knex';

import { KnexConfig } from '../types';

type Connection = {
  query: (query: string) => Promise<unknown>;
};

/**
 * Адаптирует имя приложения под имя соединения
 */
function prepareApplicationName(applicationName: string): string {
  const appName = applicationName.replace(/[^\d\w]+/g, '_');

  return `${appName.trim().toLowerCase()}:knex`;
}

/**
 * Подготавливает конфиг с учетом параметров
 */
function getKnexOptions(config: KnexConfig): Knex.Config {
  const { applicationName, pool = {}, ...otherConfig } = config;
  const { afterCreate, ...otherPool } = pool;

  return {
    ...otherConfig,
    client: 'pg',
    pool: {
      ...otherPool,
      afterCreate: async (
        conn: Connection,
        done: () => void,
      ): Promise<void> => {
        if (applicationName?.length > 0) {
          const appName = prepareApplicationName(applicationName);

          await conn.query(`SET application_name='${appName}'`);
        }

        if (afterCreate) {
          afterCreate(conn, done);
        } else {
          done();
        }
      },
    },
  };
}

export function knexFactory(config: KnexConfig): Knex {
  return createKnexClient(getKnexOptions(config));
}
