import { Knex } from 'knex';

/**
 * Обертка для выполнения RAW запросов (биндинг местами страдает)
 */
export function rawQuery(
  knex: Knex,
  sqlString: string,
  binds: Knex.RawBinding,
): Knex.Raw {
  return knex.raw(knex.raw(sqlString, binds).toQuery());
}
