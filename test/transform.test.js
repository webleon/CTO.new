const { toProxyViewModel, buildViewModels } = require('../src/transform');

function dummyAdminBuilder(type, id) { return `/admin/${type}/${id}`; }

describe('transform.toProxyViewModel', () => {
  test('builds view model with https when ssl_forced', () => {
    const input = {
      id: 1,
      domain_names: ['example.com', 'www.example.com'],
      forward_scheme: 'http',
      forward_host: '10.0.0.1',
      forward_port: 3000,
      ssl_forced: 1,
      enabled: 1,
    };
    const vm = toProxyViewModel(input, dummyAdminBuilder);
    expect(vm.enabled).toBe(true);
    expect(vm.ssl_forced).toBe(true);
    expect(vm.links.map((l) => l.url)).toEqual(['https://example.com', 'https://www.example.com']);
    expect(vm.upstream).toBe('http://10.0.0.1:3000');
    expect(vm.editUrl).toBe('/admin/proxy/1');
  });

  test('filters only enabled proxies in buildViewModels', () => {
    const proxies = [
      { id: 1, domain_names: ['a.com'], forward_scheme: 'http', forward_host: 'h', forward_port: 80, ssl_forced: 0, enabled: 1 },
      { id: 2, domain_names: ['b.com'], forward_scheme: 'http', forward_host: 'h', forward_port: 80, ssl_forced: 0, enabled: 0 },
    ];
    const vm = buildViewModels({ proxies }, false, false, dummyAdminBuilder);
    expect(vm.proxies.length).toBe(1);
    expect(vm.proxies[0].id).toBe(1);
  });
});
