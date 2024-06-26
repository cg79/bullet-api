const mongoMethods = require("./mongo-methods");

class MongoConnection {
  constructor({ bulletDataKey, connection, db }) {
    this.bulletDataKey = bulletDataKey;
    this.connection = connection;
    this.db = db;
  }

  close() {
    if (!this.connection) {
      return;
    }
    this.connection.close();
  }
  getCollection(collectionName) {
    return this.db.collection(collectionName);
  }

  //---------------------
  async findOne(collectionName, criteria) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.findOne(connection, criteria);
  }

  async find(collectionName, criteria = {}, sort = null) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.find(connection, criteria, sort);
  }

  async findOneById(collectionName, id) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.findOneById(connection, id);
  }

  async findById(collectionName, id) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.findById(connection, id);
  }

  async insertMany(collectionName, body) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.insertMany(connection, body);
  }

  async insertOne(collectionName, body) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.insertOne(connection, body);
  }

  async updateOne(collectionName, find, body) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.updateOne(connection, find, body);
  }

  async updateMany(collectionName, find, body) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.updateMany(connection, find, body);
  }

  async updateOneById(collectionName, id, body) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.updateOneById(connection, id, body);
  }

  async deleteMany(collectionName, find) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.deleteMany(connection, find);
  }

  async deleteOne(collectionName, find) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.deleteOne(connection, find);
  }

  async deleteOneById(collectionName, id) {
    const connection = this.getCollection(collectionName);
    return await mongoMethods.deleteOneById(connection, id);
  }

  async dropCollection(collectionName) {
    const collection = this.getCollection(collectionName);
    return await collection.dropCollection();
  }
}

module.exports = MongoConnection;
