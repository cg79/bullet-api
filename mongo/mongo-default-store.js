const MongoQuery = require("./mongo-query");
const ConnectionManager = require("./mongo-connection-manager");
const bulletkeysStore = require("../module/management/bullet-key-store");

class MongoDefaultStore extends MongoQuery {
  async createDefaultConnection() {
    //

    const bulletKeyData = bulletkeysStore.defaultBulletKeyValue();
    const dbConnection = await ConnectionManager.createConnection(
      bulletKeyData
    );

    this.defDbConnection = dbConnection;
    // .then((dbConnection) => {
    //   this.defDbConnection = dbConnection;
    // });
  }

  async collectionRef(name) {
    if (!this.defDbConnection) {
      await this.createDefaultConnection();
    }
    // console.log(this.defDbConnection);
    return this.defDbConnection.db.collection(name);
  }

  async close() {
    if (!this.defDbConnection) {
      return;
    }
    this.defDbConnection.connection.close();
  }

  async findDef(collectionName, criteria) {
    const collection = await this.collectionRef(collectionName);
    const doc = await this.find(collection, criteria);
    return doc;
  }

  async findByIdDef(collectionName, id) {
    const collection = await this.collectionRef(collectionName);

    // const _id = typeof id === 'string' ? ObjectId(id) : id;
    const doc = await this.findById(collection, id);
    return doc;
  }

  async findOneDef(collectionName, criteria) {
    const collection = await this.collectionRef(collectionName);
    const doc = await this.findOne(collection, criteria);
    return doc;
  }

  async findOneByIdDef(collectionName, id) {
    const collection = await this.collectionRef(collectionName);

    // const _id = typeof id === 'string' ? ObjectId(id) : id;
    const doc = await this.findOneById(collection, id);
    return doc;
  }

  async insertDef(collectionName, body) {
    const collection = await this.collectionRef(collectionName);

    const doc = await this.insert(collection, body);
    return doc; //{ _id: doc.insertedIds[0] };
  }

  async updateOneDef(collectionName, find, body) {
    const collection = await this.collectionRef(collectionName);
    const doc = await this.updateOne(collection, find, body);
    return doc;
  }

  async updateOneByIdDef(collectionName, id, body) {
    const collection = await this.collectionRef(collectionName);

    const doc = await this.updateOneById(collection, id, body);
    return doc;
  }

  async updateOneObjByIdDef(collectionName, body) {
    const { _id } = body;
    delete body._id;

    return this.updateOneByIdDef(collectionName, _id, body);
  }

  async deleteManyDef(collectionName, find) {
    const collection = await this.collectionRef(collectionName);
    const doc = await this.deleteMany(collection, find);
    return doc;
  }

  async deleteOneDef(collectionName, find) {
    this.checkId(find);
    const collection = await this.collectionRef(collectionName);
    const doc = await this.deleteOne(collection, find);
    return doc;
  }

  async deleteOneByIdDef(collectionName, id) {
    const collection = await this.collectionRef(collectionName);
    const doc = await this.deleteOneById(collection, id);
    return doc;
  }
}

module.exports = new MongoDefaultStore();
