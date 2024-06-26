const SYS_DBS = {
  USERS: "zsys-users",
  CONSTRAINTS: "zsys-constraints",

  BULLET_KEYS: "zsys-bulletkeys",
  ERRORS_COLLECTION: "zsys-errors",
};

const DEFAULT_DB_KEY = "default_key";

const DEFAULT_USER = {
  email: "aDSADAsSD@A.COM",
  password: "Aakssjdaksjdh89!",
};

const DEFAULT_BULLET_KEY = {
  guid: "default_key",
  server: "mongodb://127.0.0.1:27017",
  database: "patagonia4",
  tokenPassword: "ksjdhksjhdksjdh",
  tokenExpire: "24h",
};

module.exports = { SYS_DBS, DEFAULT_DB_KEY, DEFAULT_USER, DEFAULT_BULLET_KEY };
