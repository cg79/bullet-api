const { MongoClient } = require("mongodb");
const MongoConnection = require("./mongo-connection");
const Store = require("../store/store");
const {
  DEFAULT_DB_KEY,
  DEFAULT_BULLET_KEY,
  SYS_DBS,
} = require("../constants/constants");

class ConnectionManager extends Store {
  async getOrCreateDefaultConnection() {
    let connection = this.get(DEFAULT_DB_KEY);
    if (connection) {
      return connection;
    }
    const bulletDataKey = {
      guid: DEFAULT_DB_KEY,
      server: "mongodb://127.0.0.1:27017",
      database: "patagonia4",
      tokenPassword: "ksjdhksjhdksjdh",
      tokenExpire: "24h",
    };
    connection = await this.createMongoConnection(bulletDataKey);
    this.add(DEFAULT_DB_KEY, connection);
    return connection;
  }

  constructor() {
    super();
    this.getOrCreateDefaultConnection();
  }

  async saveBulletKeyToMainDb(bulletDataKey) {
    const defaultConnection = await this.getOrCreateDefaultConnection();
    await defaultConnection.insert(SYS_DBS.BULLET_KEYS, bulletDataKey);
  }

  async saveBulletKeyToMainDb(bodyTokenAndBulletConnection = {}) {
    const defaultConnection = await this.getOrCreateDefaultConnection();
    const {
      tokenObj,
      body: {
        name,
        email,
        server = "mongodb://127.0.0.1:27017",
        database,
        tokenPassword,
        tokenExpire = 0,
        googleStorage,
        domain = "",
        personalServerUrl = "",
        loggingServerUrl = "",
        security = 0,
        password = "",
        useSecretKey,
      },
      x_bullet_key,
    } = bodyTokenAndBulletConnection;

    if (useSecretKey === undefined) {
      throw USER_ERROR.USE_SECRET_KEY;
    }

    if (!name) {
      throw USER_ERROR.BULLET_KEY_NAME;
    }
    if (!server) {
      throw USER_ERROR.BULLET_KEY_SERVER;
    }
    if (!database) {
      throw USER_ERROR.BULLET_KEY_DATABASE;
    }

    const existingServerDb = await defaultConnection.findOne(
      SYS_DBS.BULLET_KEYS,
      {
        $and: [
          {
            server: server,
          },
          {
            database: database,
          },
        ],
      }
    );
    // console.log(existingServerDb);
    if (existingServerDb) {
      return existingServerDb;
    }

    if (!tokenPassword) {
      throw USER_ERROR.BULLET_KEY_TOKEN_PASSWORD;
    }

    if (!password) {
      throw USER_ERROR.ROOT_USER_PASSWORD;
    }

    const existingKey = await defaultConnection.findOne(SYS_DBS.BULLET_KEYS, {
      name,
    });
    if (existingKey) {
      return existingKey;
    }

    const secretKey = utils.guid();

    // const xBulletCollection = await MongoDefaultStore.collectionRef(SYS_DBS.BULLET_KEYS);

    try {
      const mongoConnection = await this.createMongoConnection(bulletDataKey);
      mongoConnection.close();

      // verify user settings

      const guid = utils.guid();

      const bulletObj = {
        userid: tokenObj ? tokenObj._id.toString() : "",
        name,
        server,
        database,
        tokenPassword,
        tokenExpire,
        googleStorage,
        domain,
        guid,
        personalServerUrl,
        loggingServerUrl,
        security,
        secretKey,
        useSecretKey,
      };

      const response = await defaultConnection.insertOne(
        SYS_DBS.BULLET_KEYS,
        bulletObj
      );

      const userData = {
        email: tokenObj ? tokenObj.email : email,
        password: encryption.encrypt(password, tokenPassword),

        bulletGuid: guid,
        isrootuser: true,
      };

      await defaultConnection.insertOne(SYS_DBS.USERS, userData);

      // const userResponse = userService.createTokenObj(userData, bulletObj);
      return bulletObj;
    } catch (ex) {
      throw ex;
    }
  }
  async getBulletKeyFromMainDb(bulletKey) {
    return DEFAULT_BULLET_KEY;
    if (bulletKey === DEFAULT_DB_KEY) {
      return DEFAULT_BULLET_KEY;
    }
    const defaultConnection = await this.getOrCreateDefaultConnection();
    return await defaultConnection.findOne(SYS_DBS.BULLET_KEYS, {
      guid: bulletKey,
    });
  }

  async getConnectionForBulletKey(xbulletId) {
    let bulletDataKeyWithConnection = this.get(xbulletId);
    if (bulletDataKeyWithConnection) {
      return bulletDataKeyWithConnection;
    }

    const bulletDataKey = await this.getBulletKeyFromMainDb(xbulletId);
    if (!bulletDataKey) {
      return null;
    }
    const dbConnectionAndDatabase = await this.createMongoConnection(
      bulletDataKey
    );
    this.add(xbulletId, dbConnectionAndDatabase);
    return dbConnectionAndDatabase;
  }

  async createMongoConnection(bulletDataKey) {
    const { server, database } = bulletDataKey;

    return new Promise((resolve, reject) => {
      MongoClient.connect(server)
        .then((connection) => {
          const myAwesomeDB = connection.db(database);
          resolve(
            new MongoConnection({
              bulletDataKey,
              connection,
              db: myAwesomeDB,
            })
          );
        })
        .catch((err) => {
          console.error(err);
          reject(err);
        });
    });
  }

  async createMongoConnectionAndSaveInDictionary(bulletDataKey, bulletKey) {
    const dbConnectionAndDatabase = await this.createMongoConnection(
      bulletDataKey
    );
    this.add(bulletKey, dbConnectionAndDatabase);
    return dbConnectionAndDatabase;
  }

  async createBulletKeyFromEmail(email) {
    const bulletKey = await this.createBulletKey({
      body: {
        name: email,
        email: email,
        database: email.replace(/[^a-zA-Z0-9]/g, ""),
        tokenPassword: email,
        useSecretKey: false,
        password: "a1",
        domain: "http://localhost:3006/,http://localhost:4200/",
      },
    });
    return bulletKey;
  }

  async getConstraintsForBulletKey(bulletKeyRecord, dbConnectionAndDatabase) {
    const collection = dbConnectionAndDatabase.db.collection(
      SYS_DBS.CONSTRAINTS
    );

    const constraints = await this.find(collection, {});
    // console.log(constraints);
    const result = {};

    const collectionList = await dbConnectionAndDatabase.db
      .listCollections()
      .toArray();

    collectionList.forEach((el) => (result[el.name] = null));
    constraints.forEach((el) => (result[el.collection] = el.constraints));

    bulletKeyRecord.constraints = result;

    return bulletKeyRecord;
  }

  async getFunctionsForBulletKey(bulletKeyRecord, dbConnectionAndDatabase) {
    const collectionName = `zsys-delta`;
    const collection = dbConnectionAndDatabase.db.collection(collectionName);

    const modulefunctions = await this.find(collection, {});

    const modules = {};
    let name = "";

    modulefunctions.forEach((el) => {
      name = el.module || el.modulename;
      if (!modules[name]) {
        modules[name] = {};
      }
      const mref = modules[name];
      mref[el.method || el.functionname] = {
        functiontext: el.functiontext,
        hasBrackets: el.hasBrackets,
      };
    });

    bulletKeyRecord.modules = modules;
    return bulletKeyRecord;
  }
}

module.exports = new ConnectionManager();
