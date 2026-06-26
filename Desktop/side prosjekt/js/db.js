// IndexedDB wrapper — stores large binary media (images, video, audio)
const DB = (() => {
  const NAME = 'ProfilVerse';
  const VER  = 4;
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(NAME, VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        ['media', 'music', 'blends', 'mixes'].forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = () => reject(req.error);
    });
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      t.onerror = () => reject(t.error);
      resolve(fn(t.objectStore(store)));
    });
  }

  function wrap(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  return {
    async put(store, record)  { return tx(store, 'readwrite', s => wrap(s.put(record))); },
    async get(store, id)      { return tx(store, 'readonly',  s => wrap(s.get(id))); },
    async getAll(store)       { return tx(store, 'readonly',  s => wrap(s.getAll())); },
    async delete(store, id)   { return tx(store, 'readwrite', s => wrap(s.delete(id))); },
    async getAllByIds(store, ids) {
      const all = await this.getAll(store);
      return all.filter(r => ids.includes(r.id));
    },
    // Read a File into an ArrayBuffer and store it
    async storeFile(store, id, file, extra = {}) {
      const buf = await file.arrayBuffer();
      return this.put(store, { id, data: buf, type: file.type, name: file.name, size: file.size, ...extra });
    },
    // Get a blob URL for a stored record
    async getBlobUrl(store, id) {
      const rec = await this.get(store, id);
      if (!rec) return null;
      const blob = new Blob([rec.data], { type: rec.type });
      return URL.createObjectURL(blob);
    }
  };
})();
