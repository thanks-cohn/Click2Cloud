// Small presentation preferences share one serialized read/modify/write per key.
export function createLocalPreference(storage, key, normalize) {
  let value = normalize(), revision = 0, writes = Promise.resolve();
  const listeners = new Set();
  function publish(raw) {
    const next = normalize(raw);
    if (JSON.stringify(next) === JSON.stringify(value)) return;
    value = next;
    for (const listener of listeners) {
      try { listener(value); } catch { /* A presentation failure cannot affect storage. */ }
    }
  }
  storage?.onChanged?.addListener?.((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes,key)) return;
    revision++;
    publish(changes[key].newValue);
  });
  const ready = Promise.resolve().then(() => storage?.local?.get(key)).then(saved => {
    if (!revision) publish(saved?.[key]);
  }, () => {});
  function update(transform) {
    async function write() {
      const saved = await storage.local.get(key);
      const next = normalize(transform(normalize(saved[key])));
      const ticket = revision;
      await storage.local.set({[key]:next});
      if (ticket === revision) publish(next);
      return value;
    }
    writes = writes.catch(() => {}).then(() => {
      const locks = globalThis.navigator?.locks;
      return locks ? locks.request(key,write) : write();
    });
    return writes;
  }
  return {ready,update,get value(){return value;},subscribe(listener){
    listeners.add(listener);
    return () => listeners.delete(listener);
  }};
}
