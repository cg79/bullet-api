class Store {
  constructor() {
    this.dict = {};
  }

  get(key) {
    return this.dict[key];
  }

  add(key, value) {
    this.dict[key] = value;
  }

  remove(key) {
    delete this.dict[key];
  }
}

module.exports = Store;
