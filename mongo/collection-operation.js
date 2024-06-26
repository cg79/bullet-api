const { DEFAULT_DB_KEY, SYS_DBS } = require("../constants/constants");
const MongoQuery = require("./mongo-query");
const { ObjectId } = require("mongodb");
const ConnectionManager = require("../mongo/mongo-connection-manager");
const bulletkeysStore = require("../module/management/bullet-key-store");
// const xdatabases = require("./x-databases");

class CollectionOperations {
  insertMany(dbCollection, data) {
    return new Promise((res, rej) => {
      return dbCollection.insertMany(data, (err, result) => {
        if (err) {
          return rej(err);
        } else {
          return res(result);
        }
      });
    });
  }
}

const instance = new CollectionOperations();
module.exports = instance;
