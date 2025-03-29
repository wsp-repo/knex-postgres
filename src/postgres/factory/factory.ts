import createKnexClient, { Knex } from 'knex';

import { ConnectionClients } from '../../common/types';
import { PgKnexConfig } from '../types';

import { PgClientConfig } from '../types/configs';
import { getClientConfig } from './config';

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
 * Обработчик создания соединения с БД
 */
async function afterCreateClient(
  connection: Connection,
  clientConfig: PgClientConfig,
): Promise<void> {
  // для проверки подключения
  await connection.query('SELECT 1;');

  if (clientConfig.applicationName?.length > 0) {
    const appName = prepareApplicationName(clientConfig.applicationName);

    await connection.query(`SET application_name='${appName}';`);
  }
}

/**
 * Возвращает KNEX-конфиг соединения с БД
 */
function getKnexConfig(clientConfig: PgClientConfig): Knex.Config {
  const { applicationName, pool = {}, ...otherConfig } = clientConfig;
  const { afterCreate, ...otherPool } = pool;

  return {
    ...otherConfig,
    client: ConnectionClients.Postgres,
    pool: {
      ...otherPool,
      afterCreate: async (
        conn: Connection,
        done: () => void,
      ): Promise<void> => {
        // для проверки подключения
        await afterCreateClient(conn, clientConfig);

        if (afterCreate) {
          afterCreate(conn, done);
        } else {
          done();
        }
      },
    },
  };
}

/**
 * Создает и возвращает Knex-объект соединения с БД
 */
export function knexFactory(config: PgKnexConfig | PgClientConfig): Knex {
  const knexConfig = getKnexConfig(getClientConfig(config));

  return createKnexClient(knexConfig);
}
