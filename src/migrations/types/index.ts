import { Knex } from 'knex';

export type ConnectionConfig = Knex.PgConnectionConfig & {
  schema?: string;
};

export type CreatorUser = {
  user: string;
  password: string;
};

export type KnexConfig = Omit<Knex.Config, 'connection'> & {
  applicationName: string;
  connection: ConnectionConfig;
};

export type MigratorConfig = Knex.MigratorConfig & {
  creator?: CreatorUser;
};
