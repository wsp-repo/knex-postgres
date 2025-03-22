import { getConnectionConfig } from '../config';

describe('Check config', () => {
  it('getConnectionConfig', () => {
    expect(() => getConnectionConfig({})).toBeTruthy();
  });
});
