import { ConnectionClients } from '../../../common';

import { PgKnexConfig } from '../../types';

import { PgClientConfig } from '../../types/configs';
import { getClientConfig } from '../config';

describe('Check config', () => {
  it('getConnectionConfig', () => {
    const knexConfig: PgKnexConfig = {
      applicationName: 'test',
      client: ConnectionClients.Postgres,
      connection: {
        connectionString: 'postgresql://user:pass@1.1.1.1:1234/base',
      },
    };
    const clientConfig: PgClientConfig = {
      applicationName: 'test',
      client: ConnectionClients.Postgres,
      connection: {
        database: 'base',
        host: '1.1.1.1',
        password: 'pass',
        port: 1234,
        user: 'user',
      },
    };

    expect(getClientConfig(knexConfig)).toEqual(clientConfig);
  });
});
