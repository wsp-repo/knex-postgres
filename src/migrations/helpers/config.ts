import { ConnectionConfig } from '../types';

/**
 * Формирует и возвращает конфиг подключения к БД
 */
// eslint-disable-next-line complexity
export function getConnectionConfig(
  connection: ConnectionConfig,
): ConnectionConfig {
  const {
    connectionString,
    host: hostConfig,
    port: portConfig,
    user: userConfig,
    password: passConfig,
    database: baseConfig,
    schema: schemaConfig,
    ...other
  } = connection;

  const connectionUrl = connectionString ? new URL(connectionString) : null;
  const host = hostConfig || connectionUrl?.hostname || 'localhost';
  const port = portConfig || Number(connectionUrl?.port) || 5432;
  const user = userConfig || connectionUrl?.username;
  const password = passConfig || connectionUrl?.password;
  const database = baseConfig || connectionUrl?.pathname;
  const schema =
    schemaConfig || connectionUrl?.searchParams.get('searchpath') || undefined;

  return { ...other, database, host, password, port, schema, user };
}
