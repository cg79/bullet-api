/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable radix */
/* eslint-disable no-new-func */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-throw-literal */
/* eslint-disable no-underscore-dangle */
const { ObjectID } = require("mongodb");
// const { json } = require("co-body");
// const { Parser } = require("expr-eval");
// eslint-disable-next-line prefer-destructuring
const Logger = require("../../logger/logger");

// const codeModule = require("../expression/code");
// const HandlebarsRenderer = require('../renderer/renderer');

const AxiosWrapper = require("../../utils/axiosWrapper");
const bulletHelpers = require("./bullet-helpers");
const {
  bulletSecurityHelpers,
  BULLET_SECURITY,
} = require("./bullet-security-helpers");
const code = require("../expression/code");
const methodLibrary = require("./method-library");
const errorService = require("../../errors/errors-service");
// const { docs } = require("googleapis/build/src/apis/docs");
const utils = require("../../utils/utils");
const store = require("../../store/memory-storage");
const management = require("../management/management");
const pubSub = require("../../pubsub/pubsub");

// const request = require('request');

const STRATEGY = {
  ONE_ON_ONE: 1,
  ONE_ON_MANY: 2,

  MANY_ON_ONE: 3,

  MANY_ON_MANY: 4,
};

class BulletService {
  // async findById(_id, name) {
  //   const filterCriteria = typeof _id === 'string' ? {
  //     _id: ObjectID(_id),
  //   } : { _id };

  //   const doc = await bulletConnection.findOnesdsdfsdaf(filterCriteria);
  //   return doc;
  // }

  getCollections = async (bullet) => {
    Logger.log(bullet);
    const { body = {}, bulletConnection, tokenObj } = bullet;
    bulletSecurityHelpers.verifyAllowListCollections(
      bulletConnection,
      tokenObj
    );

    const resultObj = await bulletConnection.db.listCollections().toArray();

    resultObj.sort((a, b) => (a.name > b.name ? 1 : -1));

    const mappedResponse = [];

    resultObj.forEach((el) => {
      if (!el.name.startsWith("z-sys")) {
        mappedResponse.push(el.name);
      }
    });

    return mappedResponse;
  };

  async dropCollection(bullet) {
    debugger;
    Logger.log(bullet);
    const { body = {}, bulletConnection, tokenObj, collection } = bullet;
    const { collectionName } = body;
    console.log("deleting collection", collectionName);

    // const collectionName = bulletHelpers.getCollectionName(
    //   collection,
    //   tokenObj,
    //   body.guid
    // );

    // if (!collectionName.startsWith("_")) {
    //   throw "Collection name must start with _";
    // }

    const response = await bulletConnection.dropCollection(collectionName);

    return response;
  }

  async findOne(bullet, previousObj = {}) {
    Logger.log(bullet);
    return this._find(bullet, previousObj);
  }

  async find(bullet, previousObj = {}) {
    Logger.log(bullet);
    bullet.many = true;
    return this._find(bullet, previousObj);
  }

  async updateOne(bullet, previousObj = {}) {
    return this.update(bullet, previousObj);
  }

  async updateMany(bullet, previousObj = {}) {
    bullet.many = true;
    return this.update(bullet, previousObj);
  }

  async deleteMany(bullet, previousObj) {
    bullet.many = true;
    return this._delete(bullet, previousObj);
  }

  async deleteOne(bullet, previousObj) {
    return this._delete(bullet, previousObj);
  }

  async insertOne(bullet, previousObj) {
    Logger.log(bullet);
    return this.insert(bullet, previousObj);
  }

  async lamda(bullet, previousObj) {
    const { bulletConnection, body, lamda, tokenObj } = bullet;

    if (!lamda) {
      return body;
    }

    const lamdaResponse = await this.executeLamda({
      bullet,
      lamda,
      previousObj,
      body,
      tokenObj,
      bulletConnection,
    });

    return lamdaResponse;
  }

  getPreviousAndBody(previous, body) {
    if (!body || Object.keys(body).length === 0) {
      return previous || {};
    }
    return [previous || {}, body];
  }
  async executeLamda({
    bullet,
    lamda,
    previousObj,
    body,
    tokenObj,
    bulletConnection,
  }) {
    let request = this.getPreviousAndBody(previousObj, body);

    const deltaResponse = await this.executedeltafunction(
      {
        bulletConnection,
        tokenObj,
        deltaFunction: {
          ...lamda,
          body: request,
        },
      },
      request
    );
    if (deltaResponse.deltaException) {
      throw deltaResponse.deltaException;
    }

    const retvalue = await this.executeResponse(
      bullet,
      lamda.response,
      deltaResponse
    );
    return retvalue;
  }

  async insertOrUpdate(bullet) {
    const { body } = bullet;

    if (!body._id) {
      return this.insert(bullet);
    }

    return this.update(bullet);
  }

  async executeFirst(bullet, bulletConnection, traceStart, previousObj, reqid) {
    await this.logInfo(bullet);
    await this.traceInfo(
      bulletConnection,
      traceStart,
      { body: bullet.body, previousObj },
      reqid
    );
    await this.saveForLaterUseIntoCollection(bullet);
    await this.executeTakeAndMergePreviousResultToFlowBody(bullet, previousObj);
  }

  async executeEnd(bullet, bodyData, previousObj) {
    const {
      bulletConnection,
      merge,
      mergePreviousResultToFlowResult,
      mergePreviousResultToFlowBody,
      join,
      body,
    } = bullet;

    let retvalue = bodyData;

    if (mergePreviousResultToFlowBody) {
      retvalue = {
        ...retvalue,
        ...body,
      };
    }

    if (merge) {
      retvalue = await this.executeFunction(
        merge,
        [bodyData, previousObj],
        bulletConnection,
        bullet.tokenObj,
        bullet.reqid
      );
    }

    if (join) {
      await this.executeJoins(join, retvalue, bulletConnection);
    }

    retvalue = await this.executeResponse(bullet, bullet.response, retvalue);

    if (mergePreviousResultToFlowResult) {
      retvalue = bulletHelpers.mergeObjects(retvalue, previousObj, bullet.name);
    }

    await this.traceInfo(
      bulletConnection,
      bullet.traceEnd,
      retvalue,
      bullet.reqid
    );

    return retvalue;
  }

  async insert(bullet, previousObj) {
    if (!bullet.body) {
      bullet.body = {};
    }
    const {
      collection,
      tokenObj,
      flow,
      bulletConnection,
      koa_files,
      traceStart,
      executeflowByName,
      reqid,
    } = bullet;

    if (!tokenObj) {
      throw "no token";
    }

    // const { bulletConnection } = bulletConnection;

    if (executeflowByName) {
      const dbFlow = await this.getFlowByName(
        executeflowByName,
        bulletConnection
      );
      bulletHelpers.copyFlowProps(bullet, dbFlow);

      flow = dbFlow;
      flowResult = await this.tryExecuteFlow(flow, previousObj);
      return flowResult;
    }

    await this.executeFirst(
      bullet,
      bulletConnection,
      traceStart,
      previousObj,
      reqid
    );

    const body = bullet.body || {};

    if (body._id) {
      delete body._id;
    }

    const collectionName = bulletHelpers.getCollectionName(
      collection,
      tokenObj,
      body.guid
    );

    // bulletSecurityHelpers.verifyAllowCreateCollection(
    //   bulletConnection,
    //   tokenObj,
    //   collectionName
    // );

    let many = false;
    const date = new Date();

    let bodyData = null;

    if (Array.isArray(body)) {
      bodyData = [];
      many = true;

      body.forEach(async (el) => {
        el.addedms = date.getTime();
        el.userid = tokenObj ? tokenObj._id : null;
        if (!el._id) {
          delete el._id;
        }

        bulletHelpers.validateConstraints(
          bulletConnection,
          collection.name,
          el
        );
        bodyData.push(el);
      });
    } else {
      if (!body._id) {
        delete body._id;
      }
      bodyData = body;

      bodyData.addedms = date.getTime();
      bodyData.userid = tokenObj ? tokenObj._id : null;

      if (koa_files) {
        bodyData._files = koa_files.files;
      }

      bulletHelpers.validateConstraints(
        bulletConnection,
        collection.name,
        bodyData
      );
    }

    let resultObj = null;

    if (many) {
      resultObj = await bulletConnection.insertMany(collectionName, bodyData);
      const ids = Object.values(resultObj.insertedIds);

      bodyData.forEach((el, index) => {
        el._id = ids[index].toString();
      });
    } else {
      debugger;
      resultObj = await bulletConnection.insertOne(collectionName, bodyData);
      bodyData._id = resultObj._id;
    }

    if (bullet.key) {
      bodyData = bulletHelpers.moveObjToKey(bullet.key, bodyData);
      bullet.key = "";
    }

    const retvalue = await this.executeEnd(bullet, bodyData, previousObj);

    if (!flow) {
      return retvalue;
    }

    let flowResult = await this.processFlows(flow, retvalue, bullet);

    return flowResult;
  }

  async insert_or_update(bullet, previousObj) {
    const { body } = bullet;
    if (body._id) {
      return this.updateOne(bullet, previousObj);
    }
    return this.insertOne(bullet, previousObj);
  }

  async insertFiles(bullet) {
    if (!bullet.body) {
      bullet.body = {};
    }
    const { body = {}, koa } = bullet;

    body.files = { ...koa.files };
    return this.insert(bullet);
  }

  async update(bullet, previousObj = {}) {
    if (!bullet.body) {
      bullet.body = {};
    }
    const {
      pull,
      collection,
      tokenObj,
      flow,
      traceStart,
      executeflowByName,
      reqid,
      bulletConnection,
    } = bullet;
    // const { bulletConnection } = bulletConnection;

    if (executeflowByName) {
      const dbFlow = await this.getFlowByName(
        executeflowByName,
        bulletConnection
      );
      bulletHelpers.copyFlowProps(bullet, dbFlow);

      flow = dbFlow;
      flowResult = await this.tryExecuteFlow(flow, previousObj);
      return flowResult;
    }

    await this.executeFirst(
      bullet,
      bulletConnection,
      traceStart,
      previousObj,
      reqid
    );
    const body = bullet.body || {};

    const collectionName = bulletHelpers.getCollectionName(
      collection,
      tokenObj,
      body.guid
    );
    //todo create a function which create the find object
    let { find = {} } = bullet;

    let newFind = bulletHelpers.ensureFindExpression(find, body);
    const { userid } = newFind;

    bulletSecurityHelpers.verifyAllowUpdateCollection(
      bulletConnection,
      tokenObj,
      userid
    );

    let bodyData = bullet.body;
    delete bodyData._id;

    const setCriteria = bulletHelpers.createIncPushPull(bodyData);
    // }
    if (pull) {
      setCriteria.$pull = pull;
    }
    if (!setCriteria.$set) {
      setCriteria.$set = bodyData;
    }
    if (bullet.many) {
      const mongoResponse = await bulletConnection.updateMany(
        collectionName,
        newFind,
        setCriteria
      );
    } else {
      const date = new Date();
      bodyData.modifiedms = date.getTime();
      bodyData.updatedBy = tokenObj._id;

      bulletHelpers.validateConstraints(
        bulletConnection,
        collectionName,
        bodyData
      );

      const mongoResponse = await bulletConnection.updateOne(
        collectionName,
        newFind,
        setCriteria
      );
    }

    // const resultObj = {
    //   ...previousObj,
    //   ...body,
    // };

    const retvalue = await this.executeEnd(bullet, bodyData, previousObj);

    if (!flow) {
      return retvalue;
    }

    const flowResult = await this.processFlows(flow, retvalue, bullet);
    return flowResult;
  }

  async updateOneFiles(bullet) {
    const { body = {}, koa } = bullet;

    const entity = this.findOne(bullet);
    if (!entity) {
      throw {
        message: "entity not found for update",
      };
    }

    const { deletedFiles, replacedFiles } = koa.files;
    bullet.body = {
      ...bullet.body,
      ...koa.files,
    };

    return this.update(bullet);
  }

  async _delete(bullet, previousObj = {}) {
    if (!bullet.body) {
      bullet.body = {};
    }
    Logger.log(bullet);
    const {
      collection,
      flow,
      tokenObj,
      traceStart,
      executeflowByName,
      reqid,
      bulletConnection,
    } = bullet;

    // const { bulletConnection } = bulletConnection;

    if (executeflowByName) {
      const dbFlow = await this.getFlowByName(
        executeflowByName,
        bulletConnection
      );
      bulletHelpers.copyFlowProps(bullet, dbFlow);

      flow = dbFlow;
      flowResult = await this.tryExecuteFlow(flow, previousObj);
      return flowResult;
    }

    await this.executeFirst(
      bullet,
      bulletConnection,
      traceStart,
      previousObj,
      reqid
    );

    const body = bullet.body || {};

    const collectionName = bulletHelpers.getCollectionName(
      collection,
      tokenObj,
      body.guid
    );
    let { find = {} } = bullet;

    // const { expression } = find;
    // if (expression) {
    //   find = mongoExpression.createMongoQuery(expression);
    // }

    // this.checkFindId(find);
    // this.checkRegex(find);

    let newFind = bulletHelpers.ensureFindExpression(find, body);
    const { userid } = newFind;

    bulletSecurityHelpers.verifyAllowDeleteCollection(
      bulletConnection,
      tokenObj,
      userid
    );

    let cmdResult = null;
    let doc = null;

    if (bullet.many) {
      if (Object.keys(newFind).length === 0) {
        const inObj = find.in;
        if (inObj) {
          newFind = {};
          newFind[inObj.key] = { $in: inObj.values };
        }
      }
      cmdResult = await bulletConnection.deleteMany(collectionName, newFind);
      doc = cmdResult.resultObj;
    } else {
      if (!Object.keys(newFind).length) {
        throw new Error(
          "delete one entity whithout search criteria is not allowed"
        );
      }

      cmdResult = await bulletConnection.deleteOne(collectionName, newFind);
      doc = cmdResult.resultObj;
    }

    const retvalue = await this.executeEnd(bullet, doc, previousObj);

    if (!flow) {
      return retvalue;
    }

    const flowResult = await this.processFlows(flow, retvalue, bullet);
    return flowResult;
  }

  async _find(bullet, previousObj = {}) {
    if (!bullet.body) {
      bullet.body = {};
    }
    // Logger.log(bullet);
    const {
      collection,
      flow,
      sort,
      traceStart,
      executeflowByName,
      reqid,
      join,
      bulletConnection,
      tokenObj,
    } = bullet;
    // const { bulletConnection } = bulletConnection;

    if (executeflowByName) {
      const dbFlow = await this.getFlowByName(
        executeflowByName,
        bulletConnection
      );
      bulletHelpers.copyFlowProps(bullet, dbFlow);

      flow = dbFlow;
      flowResult = await this.tryExecuteFlow(flow, previousObj);
      return flowResult;
    }

    await this.executeFirst(
      bullet,
      bulletConnection,
      traceStart,
      previousObj,
      reqid
    );

    const body = bullet.body || {};

    const collectionName = bulletHelpers.getCollectionName(
      collection,
      tokenObj,
      body.guid,
      false
    );
    let { find = {} } = bullet;

    // const { expression } = find;
    // if (expression) {
    //   find = mongoExpression.createMongoQuery(expression);
    // }

    // this.checkFindId(find);
    // this.checkRegex(find);

    const newFind = bulletHelpers.ensureFindExpression(find, body);

    let doc = null;

    const mongoCollection = bulletConnection.getCollection(collectionName);

    if (bullet.many) {
      doc = sort
        ? await mongoCollection.find(newFind).sort(sort).toArray()
        : await mongoCollection.find(newFind).toArray();
    } else {
      doc = sort
        ? await mongoCollection.findOne(newFind).sort(sort)
        : await mongoCollection.findOne(newFind);
    }

    const retvalue = await this.executeEnd(bullet, doc, previousObj);

    if (!flow) {
      return retvalue;
    }

    // if (!key && (!response || !response.key)) {
    //   throw new Error(
    //     'using flow into find operation require to have "response" with a "key" property'
    //   );
    // }

    const flowResult = await this.processFlows(flow, retvalue, bullet);
    return flowResult;
  }

  async page(bodyTokenAndBulletConnection, previousObj = {}) {
    const {
      body,
      tokenObj,
      bulletConnection,
      collection,
      page,
      sort,
      flow,
      join,
      response,
      traceStart,
      traceEnd,
      executeflowByName,
      reqid,
      key,
      find = {},
    } = bodyTokenAndBulletConnection;

    if (executeflowByName) {
      const dbFlow = await this.getFlowByName(
        executeflowByName,
        bulletConnection
      );
      bulletHelpers.copyFlowProps(bodyTokenAndBulletConnection, dbFlow);

      flow = dbFlow;
      flowResult = await this.tryExecuteFlow(flow, previousObj);
      return flowResult;
    }

    await this.executeFirst(
      bodyTokenAndBulletConnection,
      bulletConnection,
      traceStart,
      previousObj,
      reqid
    );

    // const body = bullet.body || {};

    const collectionName = bulletHelpers.getCollectionName(
      collection,
      tokenObj,
      "",
      false
    );

    const newFind = bulletHelpers.ensureFindExpression(find, {});

    const mongoCollection = bulletConnection.getCollection(collectionName);
    let filter = await mongoCollection.find(newFind);

    page.itemsOnPage = parseInt(page.itemsOnPage);
    page.pageNo--;
    filter = filter
      .limit(page.itemsOnPage)
      .skip(page.itemsOnPage * page.pageNo);

    filter = sort ? filter.sort(sort) : filter;

    let items = await filter.toArray();
    const count = await bulletConnection
      .getCollection(collectionName)
      .countDocuments(newFind);

    if (join) {
      await this.executeJoins(join, items, bulletConnection);
    }

    let resultObj = {
      records: items,
      count,
      pageCount: Math.ceil(count / page.itemsOnPage),
      pageNo: page ? page.pageNo + 1 : 0,
    };

    let retvalue = await this.executeResponse(
      bodyTokenAndBulletConnection,
      response,
      resultObj
    );

    await this.traceInfo(bulletConnection, traceEnd, retvalue, reqid);

    // if (propKey) {
    //   const temp = results;
    //   results = {};
    //   results[propKey] = temp;
    // }
    retvalue = await this.executeEnd(
      bodyTokenAndBulletConnection,
      retvalue,
      previousObj
    );

    if (!flow) {
      return retvalue;
    }

    const flowResult = await this.processFlows(
      flow,
      retvalue,
      bodyTokenAndBulletConnection
    );
    return flowResult;
  }

  //#############################################################################################################

  async executeJoins(joins, dbResult, bulletConnection) {
    if (!joins) {
      return dbResult;
    }
    if (!dbResult) {
      return {};
    }

    if (!Array.isArray(joins)) {
      joins = [joins];
    }
    let join = null;
    let resultObj = {};
    let tempResp = {};

    for (let i = 0; i < joins.length; i++) {
      join = joins[i];
      join.bulletConnection = bulletConnection;
      // join.tokenObj =tokenObj;
      await this.executeJoin(join, dbResult);

      // tempResp = await this.executeJoin(join, dbResult);
      // resultObj = {
      //   ...resultObj,
      //   ...tempResp,
      // };
    }
    // else {
    //   joins.bulletConnection = bulletConnection;
    //   tempResp = await this.executeJoin(joins, dbResult);
    //   resultObj = {
    //     ...resultObj,
    //     ...tempResp,
    //   };
    // }

    return resultObj;
  }

  async executeJoin(join, dbResult) {
    if (!join) {
      return dbResult;
    }
    const {
      with: { collection, field: right },
      field: left,
      take,
      response,
      key = "",
      sort,
      find,
      page,
      bulletConnection,
      tokenObj,
    } = join;
    // const { bulletConnection } = bulletConnection;
    const collectionName = bulletHelpers.getCollectionName(
      collection,
      tokenObj,
      "",
      false
    );
    const method = collection.method || "findOne";
    const name = collection.name;

    const inputDataIsArray = Array.isArray(dbResult);

    let strategy = STRATEGY.ONE_ON_ONE;
    if (inputDataIsArray) {
      strategy =
        method == "findOne" ? STRATEGY.MANY_ON_ONE : STRATEGY.MANY_ON_MANY;
    } else {
      strategy =
        method == "findOne" ? STRATEGY.ONE_ON_ONE : STRATEGY.ONE_ON_MANY;
    }

    let searchValues = [];
    if (right === "_id") {
      if (inputDataIsArray && dbResult.length) {
        const firstValue = utils.readObjectValueByPath(dbResult[0], left);

        const isAlreadyObject = typeof firstValue === "object";

        dbResult.forEach((el) => {
          if (isAlreadyObject) {
            searchValues.push(utils.readObjectValueByPath(el, left));
          } else {
            searchValues.push(
              new ObjectID(utils.readObjectValueByPath(el, left))
            );
          }
        });
      } else {
        searchValues = [new ObjectID(dbResult[left])];
      }
    } else if (inputDataIsArray) {
      if (left === "_id") {
        searchValues = dbResult.map((el) => el[left].toString());
      } else {
        searchValues = dbResult.map((el) => el[left]);
      }
    } else {
      searchValues = [dbResult[left]];
    }

    const findCriteria = {};
    findCriteria[right] = {
      $in: searchValues,
    };
    const mongoCollection = bulletConnection.getCollection(collectionName);

    let rightRecords = null;
    let paginatedRecords = null;

    switch (method.toLowerCase()) {
      case "findone": {
        rightRecords = await mongoCollection.findOne(findCriteria);
        break;
      }
      case "find": {
        rightRecords = sort
          ? await mongoCollection.find(findCriteria).sort(sort).toArray()
          : await mongoCollection.find(findCriteria).toArray();
        break;
      }
      case "page": {
        if (strategy === STRATEGY.MANY_ON_MANY) {
          throw new Error(
            "join with many and many + PAGINATION is not supported"
          );
        }
        paginatedRecords = await this.page({
          ...join,
          collection: {
            ...join.with.collection,
          },

          find: findCriteria,
        });
        rightRecords = paginatedRecords.records;
        delete paginatedRecords.records;
        break;
      }
      default: {
        throw new Error(` ensure ${method} is correctly written`);
        break;
      }
    }

    let takeResult = null;

    const propKey = key ? key : name;

    switch (strategy) {
      case STRATEGY.ONE_ON_ONE: {
        if (join.join) {
          await this.executeJoins(join.join, rightRecords, bulletConnection);
        }
        takeResult = await this.processTake(
          rightRecords,
          response,
          "",
          bulletConnection,
          join.reqid
        );
        dbResult[propKey] = takeResult;
        if (paginatedRecords) {
          dbResult[`${propKey}page`] = paginatedRecords;
        }
        break;
      }
      case STRATEGY.ONE_ON_MANY: {
        if (join.join) {
          await this.executeJoins(join.join, rightRecords, bulletConnection);
        }
        takeResult = await this.processTake(
          rightRecords,
          response,
          "",
          bulletConnection,
          join.reqid
        );
        dbResult[propKey] = takeResult;
        if (paginatedRecords) {
          dbResult[`${propKey}page`] = paginatedRecords;
        }
        break;
      }
      case STRATEGY.MANY_ON_ONE: {
        if (join.join) {
          await this.executeJoins(join.join, rightRecords, bulletConnection);
        }
        takeResult = await this.processTake(
          rightRecords,
          response,
          "",
          bulletConnection,
          join.reqid
        );
        dbResult.forEach((obj) => {
          obj[propKey] = takeResult;
        });

        if (paginatedRecords) {
          dbResult[`${propKey}page`] = paginatedRecords;
        }
        break;
      }
      case STRATEGY.MANY_ON_MANY: {
        if (join.join) {
          await this.executeJoins(join.join, rightRecords, bulletConnection);
        }
        let myRecords = [];
        for (const initialObj of dbResult) {
          myRecords = rightRecords.filter(
            (el) =>
              el[right].toString() ==
              utils.readObjectValueByPath(initialObj, left).toString()
          );
          takeResult = await this.processTake(
            myRecords,
            response,
            "",
            bulletConnection,
            join.reqid
          );
          initialObj[propKey] = takeResult;
          // if (paginatedRecords) {
          //   initialObj[`${propKey}page`] = paginatedRecords;
          // }
        }
        break;
      }
      default: {
      }
    }
  }

  async processFlows(flowObj, resultObj, bullet) {
    if (!flowObj) {
      return resultObj;
    }

    let flowBody = resultObj;

    if (!Array.isArray(flowObj)) {
      bulletHelpers.copyOnlyEssentialFlowProps(bullet, flowObj);

      flowBody = await this.tryExecuteFlow(flowObj, flowBody);
      return flowBody;
    }

    const flows = flowObj;
    if (!flows || !flows.length) {
      return flowBody;
    }
    // let bodyProps = null;
    // let tempProps = null;
    for (let flow of flows) {
      bulletHelpers.copyOnlyEssentialFlowProps(bullet, flow);

      // flow.tokenObj = tokenObj;
      // flow.bulletConnection = bulletConnection;

      flowBody = await this.tryExecuteFlow(flow, flowBody);
    }

    return flowBody;
  }

  async executeFunction(take, resultObj, bulletConnection, tokenObj, reqid) {
    if (!take) {
      return resultObj;
    }

    await this.traceInfo(bulletConnection, take.traceStart, resultObj, reqid);

    let methodInputParamValue = resultObj;
    let deltaFunction = null;

    const send = take["send"];
    if (send) {
      methodInputParamValue = bulletHelpers.createResult(resultObj, send);
    }

    const method = take["method"];
    if (method) {
      if (take["module"]) {
        deltaFunction = {
          module: take["module"],
          method: method,
          body: resultObj,
        };
        resultObj = await this.executedeltafunction(
          {
            bulletConnection,
            tokenObj,
            deltaFunction,
          },
          methodInputParamValue
        );
        if (resultObj.deltaException) {
          throw resultObj.deltaException;
        }
      } else {
        resultObj = methodLibrary[method](
          methodInputParamValue,
          take["paramValue"]
        );
      }
    } else {
      if (!bulletConnection.personalServerUrl) {
        throw new Error(
          'please update bullet key to contain the "personalServerUrl" value'
        );
      }
      if (take.route) {
        resultObj = await this.executeHttpRequest(
          bulletConnection.personalServerUrl,
          take,
          methodInputParamValue,
          this.errorFunction
        );
      }
    }

    await this.traceInfo(bulletConnection, take.traceEnd, resultObj, reqid);

    return resultObj;
  }

  async checkBodyFields(bullet, previousObj) {
    // OK
    const { bodyFields, tokenObj, bulletConnection } = bullet;

    if (!bodyFields) {
      return previousObj;
    }

    const errorFunction = (err) =>
      errorService.writeErrorToDb(err, {}, bulletConnection, tokenObj);

    const keys = Object.keys(bodyFields);
    let key = "";
    let keyData = null;

    for (let i = 0; i < keys.length; i++) {
      key = keys[i];
      keyData = bodyFields[key];

      let methodInputParamValue = previousObj;
      const send = keyData["send"];
      if (send) {
        methodInputParamValue = bulletHelpers.createResult(previousObj, send);
      }

      previousObj[key] = await this.executeFunction(
        keyData,
        previousObj,
        bulletConnection,
        tokenObj,
        bullet.reqid
      );
    }

    return previousObj;
  }

  async logInfo(bullet) {
    return;
    if (!bullet.log) {
      return;
    }
    const { collection, description, route } = bullet.log;

    const bulletConnection = bullet.bulletConnection;
    const data = {
      ...bullet,
    };
    delete data.bulletConnection;
    delete data.tokenObj;

    if (description) {
      data.logdescription = description;
    }

    if (collection) {
      const mongoCollection = bulletConnection.getCollection(collection);

      await mongoCollection.insertOne(data);
      return;
    }

    const { loggingServerUrl } = bulletConnection;
    if (!loggingServerUrl) {
      return;
    }

    AxiosWrapper.post(`${loggingServerUrl}${route}`, data);
  }

  async saveForLaterUseIntoCollection(bullet) {
    return;
    if (!bullet.saveForLaterUse) {
      return;
    }
    const { name } = bullet;
    if (!name) {
      throw new Error(
        "name is required when calling saveForLaterUseIntoCollection"
      );
    }

    delete bullet.saveForLaterUse;
    delete bullet.origin;
    delete bullet.reqid;
    delete bullet.css;
    delete bullet._id;

    Object.keys(bullet).forEach((key) => {
      if (bullet[key] === undefined) {
        delete bullet[key];
      }
    });

    const bulletConnection = bullet.bulletConnection;
    const data = {
      ...bullet,
    };
    delete data.bulletConnection;
    delete data.tokenObj;

    const mongoCollection = bulletConnection.getCollection("zsys-saved_flows");

    console.log("aa");
    console.log(data);

    const resp = await mongoCollection.updateOne(
      { name: bullet.name },
      { $set: data },
      { upsert: true }
    );
  }

  async getFlowByName(name, bulletConnection) {
    return null;
    if (!name) {
      throw new Error("name is required when calling getFlowByName");
    }

    const mongoCollection = bulletConnection.getCollection("zsys-saved_flows");

    const response = await mongoCollection.findOne({
      name,
    });

    if (!response) {
      throw new Error(`flow with name ${name} not found`);
    }

    return response;
  }

  async traceInfo(bulletConnection, trace, body, reqid) {
    return;
    // const { bulletConnection } = bulletConnection;
    if (!trace) {
      return;
    }
    let bodyVal = body;
    const { collection, description, route, take } = trace;

    if (take) {
      bodyVal = await this.processTake(body, take, "", bulletConnection);
    }
    const data = {
      trace: body,
      description,
      reqid,
      addedms: new Date().getTime(),
    };

    if (collection) {
      const mongoCollection = bulletConnection.getCollection(collectionName);

      await mongoCollection.insertOne(data);
      return;
    }

    const { loggingServerUrl } = bulletConnection;
    if (!loggingServerUrl) {
      return;
    }

    AxiosWrapper.post(`${loggingServerUrl}${route}`, data);
  }

  async executeHttpRequest(serverUrl, methodObj, resultObj, errorFunction) {
    const { route, take, response } = methodObj;
    let inputParam = {};
    if (take) {
      inputParam = bulletHelpers.createResult(resultObj, take);
    }

    const url = `${serverUrl}${route}`;

    try {
      const postResponse = await AxiosWrapper.post(url, inputParam);
      if (!response || !resultObj) {
        return postResponse;
      }
      return bulletHelpers.createResult(postResponse, response);
    } catch (ex) {
      errorFunction(err);

      return {
        ...resultObj,
        ...ex,
      };
    }
  }

  async exec(flow, resultObj) {
    if (
      (bulletConnection.security & BULLET_SECURITY.EXECUTE_FUNCTIONS) ==
      BULLET_SECURITY.EXECUTE_FUNCTIONS
    ) {
      throw new Error('NO permission for "execute function" ');
    }

    const {
      module: { method, name, command },
    } = flow;

    const moduleInst = this;
    const execResponse = await moduleInst[method](command);
    return execResponse;
  }

  //todo check if we really need before
  async tryExecuteFlow(flow, resultObj) {
    if (!flow) {
      return resultObj;
    }

    //todo fa o functie care sa faca exact ca spread operator da fara spread. pui in resultObj direct...
    // if (body) {
    //   resultObj = {
    //     ...resultObj,
    //     ...body,
    //   };
    // }

    // const { before } = flow;
    // if (before) {
    //   resultObj = bulletHelpers.createResult(resultObj, before);
    // }
    // const compiledFunction = this.compileFlowCondition(flow);
    // if (compiledFunction) {
    //   const canContinue = compiledFunction(resultObj);
    //   if (!canContinue) {
    //     return resultObj;
    //   }
    // }

    let mustStop = false;
    try {
      mustStop = await this.shouldStopExecuteFlow(flow, resultObj);
    } catch (ex) {
      throw ex;
    }

    if (mustStop) {
      const { errorcode } = flow;
      if (errorcode) {
        throw {
          code: errorcode,
        };
      }
      return resultObj;
    }

    let flowResult = resultObj;

    flowResult = await this.executeFlow(flow, resultObj);

    return flowResult;
  }

  async triggerExecuteFlow(bullet) {
    const { name, previous, savedFlow, bulletConnection, executeflowByName } =
      bullet;

    // const dbFlow = await this.getFlowByName(name, bulletConnection);

    let usedFlow = savedFlow;
    if (!usedFlow) {
      usedFlow = await this.getFlowByName(executeflowByName, bulletConnection);
    }

    bulletHelpers.copyFlowProps(bullet, usedFlow);

    const resultObj = await this.tryExecuteFlow(usedFlow, previous);
    return resultObj;
  }

  async triggerUpdateFlow(bullet) {
    const { name, previous, savedFlow, bulletConnection } = bullet;

    // const dbFlow = await this.getFlowByName(name, bulletConnection);

    const dbFlow = savedFlow;
    bulletHelpers.copyOnlyEssentialFlowProps(bullet, dbFlow);
    dbFlow.saveForLaterUse = true;

    const resultObj = await this.saveForLaterUseIntoCollection(dbFlow);
    return resultObj;
  }

  async executeFlow(flow, previousObj) {
    // const method = this.getMethodFromFlow(flow);
    // if (!method) {
    //   return resultObj;
    // }
    // await this.traceInfo(flow.bulletConnection, flow.trace, resultObj, {});

    let shouldExecuteFlowResult = await this.shouldExecuteFlow(
      flow,
      previousObj
    );
    if (!shouldExecuteFlowResult) {
      const nestedFlow = flow.flow;
      if (!nestedFlow) {
        return previousObj;
      }
      bulletHelpers.copyOnlyEssentialFlowProps(flow, nestedFlow);

      // nestedFlow.bulletConnection = flow.bulletConnection;
      // nestedFlow.tokenObj = flow.tokenObj;
      // nestedFlow.reqid = flow.reqid;

      // nestedFlow.body = {
      //   ...(nestedFlow.body || {}),
      //   ...resultObj
      // }

      return this.tryExecuteFlow(nestedFlow, previousObj);
    }

    let flowResult = {};

    const {
      body = {},
      bulletConnection,
      traceStart,
      reqid,
      executeflowByName,
      forEach,
    } = flow;

    if (forEach && Array.isArray(body)) {
      debugger;
      return await this.executeFlowForEach(flow, previousObj);
    }

    if (executeflowByName) {
      const dbFlow = await this.getFlowByName(
        executeflowByName,
        bulletConnection
      );

      bulletHelpers.copyOnlyEssentialFlowProps(flow, dbFlow);

      flow = dbFlow;

      flowResult = await this.tryExecuteFlow(flow, previousObj);
      const retvalue = await this.executeEnd(flow, flowResult, previousObj);
      return retvalue;
    }

    await this.traceInfo(
      bulletConnection,
      traceStart,
      { body, previousObj },
      reqid
    );
    await this.saveForLaterUseIntoCollection(flow);

    // resultObj = {
    //   ...(flow.body || {}),
    //   ...resultObj,
    // };

    const { collection, module, run, tokenObj, lamda } = flow;

    if (!collection && !flow.merge && !flow.lamda) {
      throw new Error(
        `flow ${
          flow.name || ""
        } does not have collection object or merge object or lamda`
      );
    }

    if (collection) {
      if (!collection.method) {
        throw new Error("please provide flow.collection.method");
      }
      const methodPointer = this[collection.method];
      if (!methodPointer) {
        throw new Error(`${collection.method} method is not registered`);
      }
      flowResult = await this[collection.method].call(this, flow, previousObj);
    }
    if (lamda) {
      flowResult = await this.executeLamda({
        bullet: flow,
        lamda,
        previousObj,
        body,
        tokenObj,
        bulletConnection,
      });
      flowResult = await this.executeEnd(flow, flowResult, previousObj);
    }

    if (flow.merge) {
      const temp = await this.executeFunction(
        flow.merge,
        [body, previousObj],
        flow.bulletConnection,
        flow.tokenObj,
        flow.reqid
      );

      flowResult = await this.executeResponse(flow, flow.response, temp);

      await this.traceInfo(
        flow.bulletConnection,
        flow.traceEnd,
        flowResult,
        reqid
      );

      const nestedFlow = flow.flow;
      if (nestedFlow) {
        bulletHelpers.copyOnlyEssentialFlowProps(flow, nestedFlow);

        flowResult = await this.processFlows(nestedFlow, flowResult, flow);
      }
    }

    // const retvalue = await this.executeEnd(flow, flowResult, previousObj);

    return flowResult;
  }

  async executeFlowForEach(flow, previousObj) {
    debugger;

    let flowResult = {};

    const { body = {}, bulletConnection, reqid } = flow;

    const { collection, module, run, tokenObj, lamda } = flow;

    if (!collection && !flow.merge && !flow.lamda) {
      throw new Error(
        `flow ${
          flow.name || ""
        } does not have collection object or merge object or lamda`
      );
    }

    const forEachFlowResult = [];

    for (let bodyValue of body) {
      if (collection) {
        if (!collection.method) {
          throw new Error("please provide flow.collection.method");
        }
        const methodPointer = this[collection.method];
        if (!methodPointer) {
          throw new Error(`${collection.method} method is not registered`);
        }
        flowResult = await this[collection.method].call(
          this,
          flow,
          previousObj
        );
      }
      if (lamda) {
        flowResult = await this.executeLamda({
          bullet: flow,
          lamda,
          previousObj,
          body: bodyValue,
          tokenObj,
          bulletConnection,
        });
        flowResult = await this.executeEnd(flow, flowResult, previousObj);
      }

      if (flow.merge) {
        const temp = await this.executeFunction(
          flow.merge,
          [bodyValue, previousObj],
          flow.bulletConnection,
          flow.tokenObj,
          flow.reqid
        );

        flowResult = await this.executeResponse(flow, flow.response, temp);

        await this.traceInfo(
          flow.bulletConnection,
          flow.traceEnd,
          flowResult,
          reqid
        );

        const nestedFlow = flow.flow;
        if (nestedFlow) {
          bulletHelpers.copyOnlyEssentialFlowProps(flow, nestedFlow);

          flowResult = await this.processFlows(nestedFlow, flowResult, flow);
        }
      }
      const jsonValue = JSON.parse(JSON.stringify(flowResult));
      console.log(jsonValue);
      const previous_casa = flowResult.newConta;
      previous_casa.guid = utils.guid();
      previousObj.previous_casa = previous_casa;
      forEachFlowResult.push(flowResult);
    }

    // const retvalue = await this.executeEnd(flow, flowResult, previousObj);

    return forEachFlowResult;
  }

  async executeTake(bullet, take, previousObj = {}) {
    if (!take) {
      return;
    }

    let retvalue = {};

    if (take) {
      if (take.run) {
        retvalue = await this.executeFunction(
          take.run,
          [bullet.body, previousObj],
          bullet.bulletConnection,
          bullet.tokenObj,
          bullet.reqid
        );
      } else {
        retvalue = await this.processTake(
          {
            ...(bullet.body || {}),
            ...previousObj,
          },
          take,
          "",
          bullet.bulletConnection,
          bullet.reqid
        );
      }
      bullet.body = retvalue;
    }
  }

  async executeResponse(bullet, take, bodyData) {
    if (!take) {
      return bullet.key
        ? {
            [bullet.key]: bodyData,
          }
        : bodyData;
    }

    let retvalue = {};

    if (take) {
      if (take.run) {
        retvalue = await this.executeFunction(
          take,
          bodyData,
          bullet.bulletConnection,
          bullet.tokenObj,
          bullet.reqid
        );
      } else {
        retvalue = await this.processTake(
          bodyData,
          take,
          bullet.key,
          bullet.bulletConnection,
          bullet.reqid
        );
      }
    }

    return retvalue;
  }

  async executeTakeAndMergePreviousResultToFlowBody(bullet, previousObj) {
    const { mergePreviousResultToFlowBody, take } = bullet;
    const previousData = previousObj || {};

    if (!bullet.body) {
      bullet.body = {};
    }

    if (take) {
      await this.executeTake(bullet, take, previousData);
      await this.checkBodyFields(bullet, previousData); // OK
    }

    if (!mergePreviousResultToFlowBody) {
      return;
    }

    bulletHelpers.mergeObjects(bullet.body, previousData, bullet.name);
  }

  removedeltafunction = async (bullet) => {
    // const {name, module = 'bullet', implementation} = bullet;

    const { bulletConnection, tokenObj, body: deltafunction } = bullet;
    // const { bulletConnection } = bulletConnection;
    await this.logInfo(bullet);

    // if (!tokenObj.isrootuser) {
    //   throw new Error("only root users can add methods");
    // }

    if (!deltafunction) {
      throw new Error("please provide deltafunction");
    }

    const collectionName = `zsys-delta`;
    const mongoCollection = bulletConnection.getCollection(collectionName);

    // await mongoCollection.remove({});

    const find = {};
    if (deltafunction.method) {
      find.method = deltafunction.method;
    }
    const newFind = bulletHelpers.ensureFindExpression(find, deltafunction);

    if (!Object.keys(newFind).length) {
      throw new Error(
        "delete one entity whithout search criteria is not allowed"
      );
    }

    const cmdResult = await mongoCollection.deleteOne(newFind);
    return cmdResult;
  };

  registerUpdateMainDeltaFunction = async (bullet) => {
    // const {name, module = 'bullet', implementation} = bullet;

    const { bulletConnection, tokenObj, body: deltafunction } = bullet;
    // const { bulletConnection } = bulletConnection;
    await this.logInfo(bullet);

    // if (!tokenObj.isrootuser) {
    //   throw new Error("only root users can add methods");
    // }

    if (!deltafunction) {
      throw new Error(
        "please provide deltafunction and deltafunction.name + deltafunction.function"
      );
    }

    const {
      module,
      method,
      functiontext,
      guid,
      hasBrackets = false,
    } = deltafunction;

    if (!method) {
      throw new Error("please provide the deltafunction.method");
    }

    if (!functiontext) {
      throw new Error("please provide the deltafunction.functiontext");
    }

    if (!module) {
      throw new Error("please provide the deltafunction.module");
    }

    // if (!guid) {
    //   throw new Error("please provide the deltafunction.guid");
    // }

    // this.executefunc(functiontext);

    // const resultObj = codeModule.registerMethod(deltafunction);
    // if (!bulletConnection.modules) {
    //   bulletConnection.modules = {};
    // }
    // if (!bulletConnection.modules[module]) {
    //   bulletConnection.modules[module] = {};
    // }
    debugger;
    let moduleObj = store.get("modules");
    if (!moduleObj) {
      moduleObj = {};
      moduleObj[module] = {};
    }
    const moduleRef = moduleObj[module];

    moduleRef[method] = {
      functiontext,
      compiledFunction: null,

      hasBrackets,
    };
    store.add("modules", moduleObj);

    const collectionName = `zsys-delta`;
    const mongoCollection = bulletConnection.getCollection(collectionName);

    if (deltafunction._id) {
      const find = {
        _id: deltafunction._id,
      };

      bulletHelpers.checkFindId(find);

      const setCriteria = {};
      delete deltafunction._id;
      setCriteria.$set = deltafunction;

      await bulletConnection.updateOne(collectionName, find, setCriteria);
    } else {
      deltafunction.userid = tokenObj._id.toString();
      await bulletConnection.insertOne(collectionName, deltafunction); // (deltafunction);
    }

    store.remove("modules");
    //
    return {
      ok: 1,
    };
  };

  getMainDeltaFunctions = async (bullet) => {
    // const {name, module = 'bullet', implementation} = bullet;

    const { tokenObj, bulletConnection } = bullet;
    await this.logInfo(bullet);

    // if (!tokenObj.isrootuser) {
    //   throw new Error("only root users can view delta methods");
    // }

    const collectionName = `zsys-delta`;

    const response = await bulletConnection.find(collectionName, {});

    return response;
  };

  getFunctionFromModule = async (bulletConnection, module, method) => {
    let moduleObj = bulletConnection.modules[module];
    if (!moduleObj) {
      moduleObj = store.get("modules");
      if (moduleObj) {
        moduleObj = moduleObj[module];
      }
      if (!moduleObj) {
        const modules = await management.getModulesAndFunctions();
        console.log("modules", modules);
        store.add("modules", modules);
        moduleObj = modules[module];
      }
    }
    if (!moduleObj) {
      throw new Error(`module ${module} was not found`);
    }

    const functionObj = moduleObj[method];
    if (!functionObj) {
      throw new Error(`method ${method} was not found`);
    }
    return functionObj;
  };

  executedeltafunction = async (bullet) => {
    // const {name, module = 'bullet', implementation} = bullet;

    const { bulletConnection, tokenObj, deltaFunction, trace } = bullet;
    await this.logInfo(bullet);

    if (!deltaFunction) {
      throw new Error(
        "please provide deltaFunction and deltaFunction.name + deltaFunction.function"
      );
    }

    const { module, method, body, useInternalModule } = deltaFunction;
    if (useInternalModule) {
      debugger;
      const response = await pubSub.publishOnce("executeMethodFromModule", {
        bulletConnection,
        tokenObj,
        moduleName: module,
        method: method,
        body,
      });
      return response;
    }

    await this.traceInfo(bulletConnection, trace, deltaFunction, bullet.reqid);

    if (!module) {
      throw new Error("please provide the deltaFunction.module");
    }

    // if (!method) {
    //   throw new Error("please provide the deltaFunction.method");
    // }

    // if (!bulletConnection.modules) {
    //   throw new Error(`module ${module} was not found`);
    // }
    // const moduleInstance = bulletConnection.modules[module];
    // if (!moduleInstance) {
    //   throw new Error(`module ${module} was not found`);
    // }

    const functionObj = await this.getFunctionFromModule(
      bulletConnection,
      module,
      method
    );
    if (!functionObj) {
      throw new Error(`function ${method} was not found`);
    }

    const functionResult = await code.executeDeltaFunction(
      functionObj,
      testobj
    );
    //
    return functionResult;
  };

  async renderHandlebars(bullet) {
    const { options, body } = bullet;

    if (!options) {
      throw {
        message: "please provide the options object; templateUrl",
      };
    }
    if (!body) {
      throw {
        message: "please provide the body object used for rendering",
      };
    }

    const { templateUrl } = options;
    const resultObj = await HandlebarsRenderer.render(templateUrl, body);
    return resultObj;
  }

  async shouldStopExecuteFlow(flow, resultObj) {
    // throw new Error("wtf");
    const { stopIf } = flow;
    if (!stopIf) {
      return false;
    }

    let shouldStop = false;
    const { condition, errorcode, run } = stopIf;

    if (run) {
      const deltaFunction = {
        module: run["module"],
        method: run["method"],
        body: resultObj,
      };
      shouldStop = await this.executedeltafunction(
        {
          bulletConnection: flow.bulletConnection,
          tokenObj: flow.tokenObj,
          deltaFunction,
        },
        resultObj
      );
      if (shouldStop.deltaException) {
        throw shouldStop.deltaException;
      }
    }

    if (shouldStop) {
      if (errorcode) {
        throw { message: { code: errorcode }, name: "BulletError" };
      }
      return true;
    }

    // if (mustStop) {
    //   const { errorcode } = flow;
    //   if (errorcode) {
    //     throw {
    //       code: errorcode,
    //     };
    //   }
    //   return resultObj;
    // }

    // if(condition) {
    //   shouldStop = this.shouldStopBecauseCondition(condition, resultObj);
    // }

    // if (condition) {
    //   shouldStop = this.shouldStopBecauseExpression(condition, resultObj);
    //   if (shouldStop) {
    //     if (errcode) {
    //       throw new Error(errcode);
    //     }
    //     return true;
    //   }
    // }

    return false;
  }

  async shouldExecuteFlow(flow, resultObj) {
    // throw new Error("wtf");
    const { executeIf } = flow;
    if (!executeIf) {
      return true;
    }

    let shouldExecute = true;
    const { condition, errorcode, run } = executeIf;

    if (run) {
      const deltaFunction = {
        module: run["module"],
        method: run["method"],
        body: resultObj,
      };
      shouldExecute = await this.executedeltafunction(
        {
          bulletConnection: flow.bulletConnection,
          tokenObj: flow.tokenObj,
          deltaFunction,
        },
        resultObj
      );
      if (shouldExecute.deltaException) {
        throw shouldExecute.deltaException;
      }
    }

    if (!shouldExecute) {
      if (errorcode) {
        throw { message: { code: errorcode }, name: "BulletError" };
      }
      return false;
    }

    return shouldExecute;
  }

  async removeDeletedFiles(
    idOrGuidObj,
    storageKey,
    collection,
    deletedFiles,
    tokenObj,
    bulletConnection
  ) {
    if (!deletedFiles || !deletedFiles.length) {
      return;
    }

    const newCollection = {
      ...collection,
      method: "updateOne",
    };

    // https://stackoverflow.com/questions/48709923/mongodb-pull-multiple-objects-from-an-array

    const pullObj = {};
    if (deletedFiles.length === 1) {
      pullObj[`${storageKey}.list`] = deletedFiles.map((el) => {
        name: el.name;
      });
    } else {
      pullObj[`${storageKey}.list`] = {
        name: { $in: deletedFiles.map((el) => el.name) },
      };
    }

    const bulletRequest = {
      body: {
        ...idOrGuidObj,
        pull: pullObj,
      },
      collection: newCollection,
      tokenObj,
      bulletConnection,
      // method: "",
    };
    await this.updateOne(bulletRequest);
  }

  async processTake(objOrRecords, take, key, bulletConnection, reqid) {
    let temp = objOrRecords;
    if (take) {
      key = take.key || key;
      delete take.key;

      let trace = take.traceStart;
      if (trace) {
        await this.traceInfo(bulletConnection, trace, temp, reqid);
      }

      if (Array.isArray(objOrRecords)) {
        temp = objOrRecords.map((el) => bulletHelpers.createResult(el, take));
      } else {
        temp = bulletHelpers.createResult(objOrRecords, take);
      }

      trace = take.traceEnd;
      if (trace) {
        await this.traceInfo(bulletConnection, trace, temp, reqid);
      }
    }

    if (key) {
      return bulletHelpers.moveObjToKey(key, temp);
    }

    return temp;
  }
}
const instance = new BulletService();
console.log("bulletService", instance);
module.exports = instance;
