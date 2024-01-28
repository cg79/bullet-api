/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-throw-literal */
// https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
// https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens#set-up-our-node-application-(package-json)

const MongoStore = require("../../mongo/mongo-store");
const { SYS_DBS } = require("../../constants/constants");
const bulletHelpers = require("../bullet/bullet-helpers");

class ErrorLogsService {
  async errors(bullet) {
    const { page, sort, tokenObj, take, bulletDataKey } = bullet;

    const collectionName = SYS_DBS.ERRORS_COLLECTION;
    let { find = {} } = bullet;

    const newFind = find; //this.ensureFindExpression(find, {});

    const mongoCollection = await MongoStore.bulletDataCollection(
      bulletDataKey,
      collectionName
    );
    let filter = await mongoCollection.find(newFind);

    page.itemsOnPage = parseInt(page.itemsOnPage);
    page.pageNo--;
    filter = filter
      .limit(page.itemsOnPage)
      .skip(page.itemsOnPage * page.pageNo);

    filter = sort ? filter.sort(sort) : filter;

    let items = await filter.toArray();
    const count = await MongoStore.bulletDataCollection(
      bulletDataKey,
      collectionName
    ).countDocuments(newFind);

    items = bulletHelpers.readSpecificFields(items, take);

    let results = {
      records: items,
      count,
      pageCount: Math.ceil(count / page.itemsOnPage),
      pageNo: page ? page.pageNo + 1 : 0,
    };

    return results;
  }
}

module.exports = new ErrorLogsService();
