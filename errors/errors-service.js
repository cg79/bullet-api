const MongoStore = require("../mongo/mongo-store");
const { SYS_DBS } = require("../constants/constants");
class ErrorService {
  async writeErrorToDb(err, body, bulletDataKey, tokenObj = {}) {
    //const collectionName = `error${tokenObj._id}`;
    if (!bulletDataKey) {
      return;
    }

    try {
      const collectionName = SYS_DBS.ERRORS_COLLECTION;

      const mongoCollection = await MongoStore.bulletDataCollection(
        bulletDataKey,
        collectionName
      );

      const dbErr = {
        ...err,
        ...tokenObj,

        ...body,
      };

      await mongoCollection.insertOne(body); //await?
      return dbErr;
    } catch (ex) {
      console.log(ex);
      return null;
    }
  }
}

module.exports = new ErrorService();
