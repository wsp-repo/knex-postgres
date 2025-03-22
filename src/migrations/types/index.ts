import { Knex } from 'knex';

export type ConnectionConfig = Knex.PgConnectionConfig;

export type KnexConfig = Omit<Knex.Config, 'connection'> & {
  applicationName: string;
  connection: ConnectionConfig;
};

export enum AccessLevels {
  All = 'all',
  Lock = 'lock',
  Write = 'write',
  Read = 'read',
}

export type RoleConfig = {
  access: AccessLevels[];
  password: string;
};

export type MigratorConfig = Knex.MigratorConfig & {
  roles: Record<string, RoleConfig>;
};
