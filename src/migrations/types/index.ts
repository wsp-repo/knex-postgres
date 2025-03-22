import { Knex } from 'knex';

export type ConnectionConfig = Knex.PgConnectionConfig;

export type KnexConfig = Omit<Knex.Config, 'connection' | 'client'> & {
  applicationName: string;
  connection: ConnectionConfig;
};

export enum AccessLevels {
  Full = 'full',
  Read = 'read',
  Write = 'write',
}

export type RoleConfig = {
  access: AccessLevels;
  password: string;
};

export type MigratorConfig = Knex.MigratorConfig & {
  roles: Record<string, RoleConfig>;
};
