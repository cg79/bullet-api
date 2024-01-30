const Store = require("../../store/store");
const { DEFAULT_DB_KEY } = require("../../constants/constants");

class BulletKeysStore extends Store {
  constructor() {
    super();

    this.add(DEFAULT_DB_KEY, {
      server: "mongodb://0.0.0.0:27017",
      database: "patagonia4",
      tokenPassword: "ksjdhksjhdksjdh",
      tokenExpire: "2h",
    });
  }

  defaultBulletKeyValue() {
    return this.get(DEFAULT_DB_KEY);
  }
}

module.exports = new BulletKeysStore();
