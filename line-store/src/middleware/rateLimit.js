const hits = new Map();

function rateLimit(req, key, max, windowMs) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .toString()
    .split(',')[0]
    .trim();
  const k = `${key}:${ip}`;
  const now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(k, arr);

  if (hits.size > 5000) {
    for (const [entryKey, times] of hits) {
      if (!times.some(t => now - t < windowMs)) hits.delete(entryKey);
    }
  }
  return arr.length <= max;
}

module.exports = { rateLimit };
