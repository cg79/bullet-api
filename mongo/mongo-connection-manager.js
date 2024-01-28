const { MongoClient } = require("mongodb");
const MongoConnection = require("./mongo-connection");

// const server = require('../server');
// const MONGO_URL = "mongodb://localhost:27017/onlinecoding";

class ConnectionManager {
  async createConnection(bulletDataKey) {
    const { server, database } = bulletDataKey;
    let url = server;
    if (database) {
      url = `${server}/${database}`;
    }
    const resp = await this.checkConnectionString(url, database);
    return resp;
  }

  async checkConnectionString(connectionString, dbName) {
    if (!connectionString) {
      return Promise.reject("pelase provide mongo connection string");
    }
    return new Promise((resolve, reject) => {
      MongoClient.connect(connectionString)
        .then((connection) => {
          const myAwesomeDB = connection.db(dbName);
          resolve(
            new MongoConnection({
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
}

module.exports = new ConnectionManager();
