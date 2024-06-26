const { SYS_DBS } = require("../constants/constants");
class ErrorService {
  async writeErrorToDb(err, body, bulletConnection, tokenObj = {}) {
    //const collectionName = `error${tokenObj._id}`;
    const { bulletDataKey } = bulletConnection;
    if (!bulletDataKey) {
      return;
    }

    try {
      const collectionName = SYS_DBS.ERRORS_COLLECTION;

      const dbErr = {
        ...err,
        ...tokenObj,

        ...body,
      };

      await bulletConnection.insertOne(collectionName, body); //await?
      return dbErr;
    } catch (ex) {
      console.log(ex);
      return null;
    }
  }
}

module.exports = new ErrorService();
