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
function getKnexConfig(knexConfig: KnexConfig): Knex.Config {
  const { applicationName, pool = {}, ...otherConfig } = knexConfig;
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
        // для проверки подключения
        await conn.query('SELECT 1;');

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

export function knexFactory(knexConfig: KnexConfig): Knex {
  return createKnexClient(getKnexConfig(knexConfig));
}
