const Store = require("../../store/store");
const { DEFAULT_DB_KEY } = require("../../constants/constants");

class BulletKeysStore extends Store {
  constructor() {
    super();

    this.add(DEFAULT_DB_KEY, {
      guid: "default_key",
      server: "mongodb://127.0.0.1:27017",
      database: "patagonia4",
      tokenPassword: "ksjdhksjhdksjdh",
      tokenExpire: "24h",
    });
  }

  defaultBulletKeyValue() {
    return this.get(DEFAULT_DB_KEY);
  }
}

module.exports = new BulletKeysStore();
