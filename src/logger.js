function nowIso() {
  return new Date().toISOString();
}

function logBase(level, msg, extra) {
  const entry = Object.assign({
    level,
    time: nowIso(),
    msg,
  }, extra || {});
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  } catch (e) {
    // Fallback
    // eslint-disable-next-line no-console
    console.log(`[${level}] ${msg}`);
  }
}

module.exports = {
  info(msg, extra) {
    logBase('info', msg, extra);
  },
  error(msg, extra) {
    logBase('error', msg, extra);
  },
};
