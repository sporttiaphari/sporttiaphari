/** 3-way merge supaya dua editor tidak saling menimpa array event. */
export function mergeEventArrays(server = [], next = [], prev = []) {
  const serverMap = new Map(server.filter((e) => e && e.id).map((e) => [e.id, e]));
  const nextMap = new Map(next.filter((e) => e && e.id).map((e) => [e.id, e]));
  const prevMap = new Map(prev.filter((e) => e && e.id).map((e) => [e.id, e]));

  const deleted = new Set();
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) deleted.add(id);
  }

  const added = [];
  for (const [id, ev] of nextMap) {
    if (!prevMap.has(id)) added.push(ev);
  }

  const updated = new Map();
  for (const [id, ev] of nextMap) {
    if (!prevMap.has(id)) continue;
    try {
      if (JSON.stringify(ev) !== JSON.stringify(prevMap.get(id))) updated.set(id, ev);
    } catch (e) {
      updated.set(id, ev);
    }
  }

  const out = [];
  const seen = new Set();

  for (const ev of server) {
    if (!ev || !ev.id) continue;
    if (deleted.has(ev.id)) continue;
    if (updated.has(ev.id)) {
      out.push(updated.get(ev.id));
    } else {
      out.push(ev);
    }
    seen.add(ev.id);
  }

  for (const ev of added) {
    if (ev?.id && !seen.has(ev.id) && !deleted.has(ev.id)) {
      out.push(ev);
      seen.add(ev.id);
    }
  }

  for (const ev of next) {
    if (ev?.id && !seen.has(ev.id) && !deleted.has(ev.id)) {
      out.push(ev);
      seen.add(ev.id);
    }
  }

  return out;
}

export function mergeMaps(server = {}, next = {}, prev = {}) {
  const out = { ...(server || {}) };
  const prevKeys = new Set(Object.keys(prev || {}));
  const nextKeys = new Set(Object.keys(next || {}));
  for (const k of prevKeys) {
    if (!nextKeys.has(k)) delete out[k];
  }
  for (const k of nextKeys) {
    out[k] = next[k];
  }
  return out;
}
