import { Knex } from 'knex';

export type ConnectionConfig = Knex.PgConnectionConfig;

export type KnexConfig = Omit<Knex.Config, 'connection'> & {
  applicationName: string;
  connection: ConnectionConfig;
};

export enum GrantLevels {
  All = 'all',
  Lock = 'lock',
  Write = 'write',
  Read = 'read',
}

export type RoleConfig = {
  grantLevel: GrantLevels;
  password: string;
  username: string;
};

export type MigratorConfig = Knex.MigratorConfig & {
  roleConfigs: RoleConfig[];
};
