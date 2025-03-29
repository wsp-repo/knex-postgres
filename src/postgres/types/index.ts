import { Knex } from 'knex';

import { ClientConfig, ConnectionClients } from '../../common/types/clients';

export type PgKnexConfig = ClientConfig<
  ConnectionClients.Postgres,
  Knex.PgConnectionConfig
>;
