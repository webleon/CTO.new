const { parseDomainNames, normalizeDomain, transformProxyHostRows } = require('../src/sqlite');

describe('sqlite domain parsing and normalization', () => {
  test('parses JSON array string', () => {
    const raw = '["Example.com", "WWW.Test.org "]';
    const arr = parseDomainNames(raw).map(normalizeDomain);
    expect(arr).toEqual(['example.com', 'www.test.org']);
  });

  test('parses comma-separated string fallback', () => {
    const raw = 'foo.com, bar.example.com ; baz.io  qux.dev';
    const arr = parseDomainNames(raw).map(normalizeDomain);
    expect(arr).toEqual(['foo.com', 'bar.example.com', 'baz.io', 'qux.dev']);
  });

  test('parses array and objects', () => {
    const raw = ['a.com', { name: 'B.com' }, { domain: 'c.com' }, { host: 'D.io' }];
    const arr = parseDomainNames(raw).map(normalizeDomain);
    expect(arr).toEqual(['a.com', 'b.com', 'c.com', 'd.io']);
  });

  test('normalizes protocol, ports and paths', () => {
    const cases = [
      'HTTP://User:Pass@ExAmple.Com:8080/some/path?x=1#frag',
      'https://example.com/',
      'example.com:443',
      '  sub.EXAMPLE.com.  ',
    ];
    const got = cases.map(normalizeDomain);
    expect(got).toEqual(['example.com', 'example.com', 'example.com', 'sub.example.com']);
  });
});

describe('sqlite transformProxyHostRows', () => {
  test('filters disabled and deleted rows and returns clean services', () => {
    const rows = [
      { id: 1, enabled: 1, deleted_at: null, domain_names: '["a.com", "A.com"]', ssl_forced: 0, remark: 'one' },
      { id: 2, enabled: 0, deleted_at: null, domain_names: 'b.com', ssl_forced: 1, remark: 'two' },
      { id: 3, enabled: 1, deleted_at: '2024-01-01', domain_names: 'c.com', ssl_forced: 1, remark: 'three' },
      { id: 4, enabled: 1, domain_names: 'http://foo.example.com:80/path', ssl_forced: '1', remark: '' },
    ];
    const services = transformProxyHostRows(rows);
    expect(services).toEqual([
      { id: 1, remark: 'one', ssl_forced: false, domains: ['a.com'] },
      { id: 4, remark: '', ssl_forced: true, domains: ['foo.example.com'] },
    ]);
  });
});
