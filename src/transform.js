function boolify(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function computeDisplayName(item, domains, getTitleOverride) {
  const id = item && item.id;
  const tryGet = (v) => (v == null ? '' : String(v)).trim();
  let chosen = '';
  if (typeof getTitleOverride === 'function' && id != null) {
    const o = tryGet(getTitleOverride(id));
    if (o) chosen = o;
  }
  if (!chosen && item && tryGet(item.remark)) {
    chosen = tryGet(item.remark);
  }
  if (!chosen && Array.isArray(domains) && domains.length > 0) {
    chosen = tryGet(domains[0]);
  }
  if (!chosen && id != null) {
    chosen = `#${id}`;
  }
  return escapeHtml(chosen);
}

function toProxyViewModel(item, adminBaseUrlBuilder, getTitleOverride) {
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
    displayName: computeDisplayName(item, domains, getTitleOverride),
    editUrl: adminBaseUrlBuilder('proxy', item.id),
  };
}

function toRedirectViewModel(item, adminBaseUrlBuilder, getTitleOverride) {
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
    displayName: computeDisplayName(item, domains, getTitleOverride),
    editUrl: adminBaseUrlBuilder('redirect', item.id),
  };
}

function toStreamViewModel(item, adminBaseUrlBuilder, getTitleOverride) {
  const enabled = boolify(item.enabled);
  const sslForced = boolify(item.ssl_forced);
  const incomingProto = item.incoming_protocol || item.protocol || 'tcp';
  const incomingPort = item.incoming_port || item.port || '';
  const upstreamHost = item.forwarding_host || item.forward_host || 'localhost';
  const upstreamPort = item.forwarding_port || item.forward_port || '';
  const domains = incomingPort ? [`:${incomingPort}`] : [];
  return {
    type: 'stream',
    id: item.id,
    enabled,
    ssl_forced: sslForced,
    domains,
    links: [],
    upstream: `${incomingProto} -> ${upstreamHost}${upstreamPort ? `:${upstreamPort}` : ''}`,
    displayName: computeDisplayName(item, domains, getTitleOverride),
    editUrl: adminBaseUrlBuilder('stream', item.id),
  };
}

function buildViewModels({ proxies = [], redirects = [], streams = [] }, includeRedirects = false, includeStreams = false, adminBaseUrlBuilder, getTitleOverride, getSnapshotVersion) {
  const proxyModels = proxies.map((p) => toProxyViewModel(p, adminBaseUrlBuilder, getTitleOverride)).filter((m) => m.enabled);
  const redirectModels = includeRedirects ? redirects.map((r) => toRedirectViewModel(r, adminBaseUrlBuilder, getTitleOverride)).filter((m) => m.enabled) : [];
  const streamModels = includeStreams ? streams.map((s) => toStreamViewModel(s, adminBaseUrlBuilder, getTitleOverride)).filter((m) => m.enabled) : [];
  const snapshot = typeof getSnapshotVersion === 'function' ? getSnapshotVersion() : 0;
  return {
    proxies: proxyModels,
    redirects: redirectModels,
    streams: streamModels,
    snapshotVersion: snapshot,
  };
}

module.exports = {
  boolify,
  toProxyViewModel,
  toRedirectViewModel,
  toStreamViewModel,
  buildViewModels,
};
