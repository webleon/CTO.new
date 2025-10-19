function boolify(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function toProxyViewModel(item, adminBaseUrlBuilder) {
  const enabled = boolify(item.enabled);
  const sslForced = boolify(item.ssl_forced);
  const domains = Array.isArray(item.domain_names) ? item.domain_names : [];
  const links = domains.map((d) => ({
    host: d,
    url: `${sslForced ? 'https' : 'http'}://${d}`,
  }));
  const upstream = [item.forward_scheme || 'http', '://', item.forward_host || 'localhost', item.forward_port ? `:${item.forward_port}` : ''].join('');
  return {
    type: 'proxy',
    id: item.id,
    enabled,
    ssl_forced: sslForced,
    domains,
    links,
    upstream,
    editUrl: adminBaseUrlBuilder('proxy', item.id),
  };
}

function toRedirectViewModel(item, adminBaseUrlBuilder) {
  const enabled = boolify(item.enabled);
  const sslForced = boolify(item.ssl_forced);
  const domains = Array.isArray(item.domain_names) ? item.domain_names : [];
  const links = domains.map((d) => ({
    host: d,
    url: `${sslForced ? 'https' : 'http'}://${d}`,
  }));
  const target = item.forward_domain_name || item.forward_scheme || '';
  return {
    type: 'redirect',
    id: item.id,
    enabled,
    ssl_forced: sslForced,
    domains,
    links,
    upstream: target ? `-> ${target}` : '->',
    editUrl: adminBaseUrlBuilder('redirect', item.id),
  };
}

function toStreamViewModel(item, adminBaseUrlBuilder) {
  const enabled = boolify(item.enabled);
  const sslForced = boolify(item.ssl_forced);
  const incomingProto = item.incoming_protocol || item.protocol || 'tcp';
  const incomingPort = item.incoming_port || item.port || '';
  const upstreamHost = item.forwarding_host || item.forward_host || 'localhost';
  const upstreamPort = item.forwarding_port || item.forward_port || '';
  return {
    type: 'stream',
    id: item.id,
    enabled,
    ssl_forced: sslForced,
    domains: incomingPort ? [`:${incomingPort}`] : [],
    links: [],
    upstream: `${incomingProto} -> ${upstreamHost}${upstreamPort ? `:${upstreamPort}` : ''}`,
    editUrl: adminBaseUrlBuilder('stream', item.id),
  };
}

function buildViewModels({ proxies = [], redirects = [], streams = [] }, includeRedirects = false, includeStreams = false, adminBaseUrlBuilder) {
  const proxyModels = proxies.map((p) => toProxyViewModel(p, adminBaseUrlBuilder)).filter((m) => m.enabled);
  const redirectModels = includeRedirects ? redirects.map((r) => toRedirectViewModel(r, adminBaseUrlBuilder)).filter((m) => m.enabled) : [];
  const streamModels = includeStreams ? streams.map((s) => toStreamViewModel(s, adminBaseUrlBuilder)).filter((m) => m.enabled) : [];
  return {
    proxies: proxyModels,
    redirects: redirectModels,
    streams: streamModels,
  };
}

module.exports = {
  boolify,
  toProxyViewModel,
  toRedirectViewModel,
  toStreamViewModel,
  buildViewModels,
};
