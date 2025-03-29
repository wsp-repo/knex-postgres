import { Knex } from 'knex';

import { ClientConfig, ConnectionClients } from '../../common/types/clients';

/* prettier-ignore */
export type PgConnectionConfig =
  & Omit<Knex.PgConnectionConfig, 'host' | 'port' | 'connectionUrl'>
  & Required<Pick<Knex.PgConnectionConfig, 'host' | 'port'>>;

export type PgClientConfig = ClientConfig<
  ConnectionClients.Postgres,
  PgConnectionConfig
>;
