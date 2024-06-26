const { DEFAULT_DB_KEY, SYS_DBS } = require("../constants/constants");
const MongoQuery = require("./mongo-query");

const { ObjectId } = require("mongodb");
const ConnectionManager = require("../mongo/mongo-connection-manager");
const bulletkeysStore = require("../module/management/bullet-key-store");
const utils = require("../utils/utils");
const cryptoJS = require("node-cryptojs-aes").CryptoJS;
const encryption = require("../utils/encryption")(cryptoJS);
// const xdatabases = require("./x-databases");

class MongoStore extends MongoQuery {
  constructor() {
    super();
  }

  bulletDataCollection(bulletDataKey, collectionName) {
    return bulletDataKey.db.collection(collectionName);
  }

  async findStore(bulletDataKey, collectionName, criteria, sort = null) {
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    const doc = await this.find(collection, criteria, sort);
    return doc;
  }

  async findOneStore(bulletDataKey, collectionName, criteria) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    const doc = await this.findOne(collection, criteria);
    return doc;
  }

  async findOneByIdStore(bulletDataKey, collectionName, id) {
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    // const collection = await this.databaseStore(key, collectionName);

    const _id = typeof id === "string" ? ObjectId(id) : id;
    const doc = await this.findOne(collection, { _id });
    return doc;
  }

  async insertStore(bulletDataKey, collectionName, body) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);

    const doc = await this.insert(collection, body);
    return doc;
  }

  async insertOneStore(bulletDataKey, collectionName, body) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);

    const doc = await this.insertOne(collection, body);
    return doc;
  }

  async updateOneStore(bulletDataKey, collectionName, find, body) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    const doc = await this.updateOne(collection, find, body);
    return doc;
  }

  async updateOneByIdStore(bulletDataKey, collectionName, id, body) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    const _id = typeof id === "string" ? ObjectId(id) : id;
    delete body._id;

    const doc = await this.updateOne(collection, { _id }, body);
    return doc;
  }

  async deleteManyStore(bulletDataKey, collectionName, find) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    const doc = await this.deleteMany(collection, find);
    return doc;
  }

  async deleteOneStore(bulletDataKey, collectionName, find) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    const doc = await this.deleteOne(collection, find);
    return doc;
  }

  async deleteOneByIdStore(bulletDataKey, collectionName, id) {
    // const collection = await this.databaseStore(key, collectionName);
    const collection = this.bulletDataCollection(bulletDataKey, collectionName); //this.databaseStore(key, collectionName);
    // const _id = typeof id === 'string' ? ObjectId(id) : id;
    const doc = await this.deleteOneById(collection, id);
    return doc;
  }
}

const mongoStoreInstance = new MongoStore();
module.exports = mongoStoreInstance;
