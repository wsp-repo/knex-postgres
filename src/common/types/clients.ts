import { Knex } from 'knex';

export enum ConnectionClients {
  Postgres = 'pg',
}

export type ClientConfig<Client extends ConnectionClients, Connection> = Omit<
  Knex.Config,
  'connection' | 'client'
> & {
  applicationName: string;
  client: Client;
  connection: Connection;
};
