import { Knex } from 'knex';

export enum UserLevels {
  Full = 'full',
  None = 'none',
  Read = 'read',
  Write = 'write',
}

export type UserConfig = {
  level: UserLevels;
  password: string;
  username: string;
};

export type MigratorConfig = Knex.MigratorConfig & {
  users: UserConfig[];
};
