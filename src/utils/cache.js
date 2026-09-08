class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize || 100;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }

  delete(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

module.exports = {
  LRUCache,
};
