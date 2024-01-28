const { DEFAULT_DB_KEY, SYS_DBS } = require("../constants/constants");
const MongoQuery = require("./mongo-query");
const MongoDefaultStore = require("./mongo-default-store");
const { ObjectId } = require("mongodb");
const ConnectionManager = require("../mongo/mongo-connection-manager");
const bulletkeysStore = require("../module/management/bullet-key-store");
// const xdatabases = require("./x-databases");

class MongoStore extends MongoQuery {
  constructor() {
    super();
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

  async dropCollection(bulletKeyRecord, dbConnectionAndDatabase) {
    // const collection = dbConnectionAndDatabase.db.collection(
    //   SYS_DBS.CONSTRAINTS
    // );

    return { x: 1 };
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

  async getOrCreateXBulletDatabase(xbulletId) {
    // const existingDb = xdatabases.dict[xbulletId];
    // if (existingDb) {
    //   return existingDb;
    // }

    const xRecord = await this.getOrCreateBulletKeyRecord(xbulletId);

    if (!xRecord) {
      return Promise.reject(new Error(`key ${xbulletId} not found`));
    }

    if (xRecord.db) {
      return xRecord;
    }

    const dbConnectionAndDatabase =
      await ConnectionManager.checkConnectionString(
        xRecord.server,
        xRecord.database
      );
    xRecord.db = dbConnectionAndDatabase.db;
    xRecord.connection = dbConnectionAndDatabase.connection;

    // xdatabases.add(xbulletId, dbConnectionAndDatabase);

    await this.getConstraintsForBulletKey(xRecord, dbConnectionAndDatabase);

    await this.getFunctionsForBulletKey(xRecord, dbConnectionAndDatabase);

    return xRecord;
  }

  async getOrCreateBulletKeyRecord(guid) {
    const keyValue = bulletkeysStore.get(guid);
    if (keyValue) {
      return keyValue;
    }

    const bulletKeysCollection = await MongoDefaultStore.collectionRef(
      SYS_DBS.BULLET_KEYS
    );
    // const bulletKey = MongoQuery.findOneById(bulletKeysCollection, key);
    const bulletKeyRecord = await MongoDefaultStore.findOne(
      bulletKeysCollection,
      {
        guid,
      }
    );

    if (!bulletKeyRecord) {
      throw new Error(`bullet key '${guid}' could not be found`);
    }

    bulletkeysStore.add(guid, bulletKeyRecord);

    return bulletKeyRecord;
  }

  async databaseStore(xbulletId, name) {
    if (!xbulletId) {
      throw "no bullet key";
    }
    if (xbulletId === DEFAULT_DB_KEY) {
      const defCollection = await MongoDefaultStore.collectionRef(name);
      return defCollection;
    }
    const bulletKeyRecord = await this.getOrCreateXBulletDatabase(xbulletId);
    // if (!xdatabases.value(key)) {
    //   await this.getOrCreateXBulletDatabase(key);
    // }
    return bulletKeyRecord.db.collection(name);
  }

  bulletDataCollection(bulletDataKey, collectionName) {
    return bulletDataKey.db.collection(collectionName);
  }

  async findStore(key, collectionName, criteria) {
    const collection = await this.databaseStore(key, collectionName);
    const doc = await this.find(collection, criteria);
    return doc;
  }

  async findOneStore(key, collectionName, criteria) {
    const collection = await this.databaseStore(key, collectionName);
    const doc = await this.findOne(collection, criteria);
    return doc;
  }

  async findOneByIdStore(key, collectionName, id) {
    const collection = await this.databaseStore(key, collectionName);

    const _id = typeof id === "string" ? ObjectId(id) : id;
    const doc = await this.findOne(collection, { _id });
    return doc;
  }

  async insertStore(key, collectionName, body) {
    const collection = await this.databaseStore(key, collectionName);

    const doc = await this.insert(collection, body);
    return doc;
  }

  async updateOneStore(key, collectionName, find, body) {
    const collection = await this.databaseStore(key, collectionName);
    const doc = await this.updateOne(collection, find, body);
    return doc;
  }

  async updateOneByIdStore(key, collectionName, id, body) {
    const collection = await this.databaseStore(key, collectionName);
    const _id = typeof id === "string" ? ObjectId(id) : id;

    const doc = await this.updateOne(collection, { _id }, body);
    return doc;
  }

  async deleteManyStore(key, collectionName, find) {
    const collection = await this.databaseStore(key, collectionName);
    const doc = await this.deleteMany(collection, find);
    return doc;
  }

  async deleteOneStore(key, collectionName, find) {
    const collection = await this.databaseStore(key, collectionName);
    const doc = await this.deleteOne(collection, find);
    return doc;
  }

  async deleteOneByIdStore(key, collectionName, id) {
    const collection = await this.databaseStore(key, collectionName);
    // const _id = typeof id === 'string' ? ObjectId(id) : id;
    const doc = await this.deleteOneById(collection, id);
    return doc;
  }
}

const mongoStoreInstance = new MongoStore();
module.exports = mongoStoreInstance;
