/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-throw-literal */
// https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
// https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens#set-up-our-node-application-(package-json)

const ConnectionManager = require("../../mongo/mongo-connection-manager");
const USER_ERROR = require("../user/user-errors");
const BulletError = require("../../errors/bulletError");
const bulletkeysStore = require("./bullet-key-store");
const utils = require("../../utils/utils");
const { ObjectId } = require("mongodb");
const userService = require("../user/user-service");
const cryptoJS = require("node-cryptojs-aes").CryptoJS;
const encryption = require("../../utils/encryption")(cryptoJS);
const store = require("../../store/memory-storage");

const MongoQuery = require("../../mongo/mongo-query");
const { DEFAULT_DB_KEY, SYS_DBS } = require("../../constants/constants");

class ManagementService {
  async createBulletKeyAndConenction(bodyTokenAndBulletConnection = {}) {
    const {
      tokenObj,
      body: {
        name,
        email,
        server = "mongodb://127.0.0.1:27017",
        database,
        tokenPassword,
        tokenExpire = 0,
        googleStorage,
        domain = "",
        personalServerUrl = "",
        loggingServerUrl = "",
        security = 0,
        password = "",
        useSecretKey,
      },
      bulletkey,
    } = bodyTokenAndBulletConnection;

    const bulletConnection = await ConnectionManager.getConnectionForBulletKey(
      DEFAULT_DB_KEY
    );

    bodyTokenAndBulletConnection.bulletConnection = bulletConnection;

    if (useSecretKey === undefined) {
      throw USER_ERROR.USE_SECRET_KEY;
    }

    if (!name) {
      throw USER_ERROR.BULLET_KEY_NAME;
    }
    if (!server) {
      throw USER_ERROR.BULLET_KEY_SERVER;
    }
    if (!database) {
      throw USER_ERROR.BULLET_KEY_DATABASE;
    }

    // const existingBulletKey = await bulletConnection.findOne(
    //   SYS_DBS.BULLET_KEYS,
    //   {
    //     $and: [
    //       {
    //         server: server,
    //       },
    //       {
    //         database: database,
    //       },
    //     ],
    //   }
    // );

    const existingBulletKey = await bulletConnection.findOne(
      SYS_DBS.BULLET_KEYS,
      {
        guid: bulletkey,
      }
    );

    if (existingBulletKey) {
      return await ConnectionManager.createMongoConnectionAndSaveInDictionary(
        existingBulletKey,
        bulletkey
      );
    }
    // console.log(existingServerDb);
    // if (existingServerDb && existingServerDb.length) {
    //   throw USER_ERROR.DATABASE_KEY_EXISTS;
    // }

    if (!tokenPassword) {
      throw USER_ERROR.BULLET_KEY_TOKEN_PASSWORD;
    }

    if (!password) {
      throw USER_ERROR.ROOT_USER_PASSWORD;
    }

    // const existingKey = await bulletConnection.findOne(SYS_DBS.BULLET_KEYS, {
    //   name,
    // });
    // if (existingKey) {
    //   throw USER_ERROR.BULLET_KEY_NAME_EXISTS;
    // }

    const secretKey = utils.guid();
    const guid = bulletkey;

    try {
      const newBulletKey = {
        userid: tokenObj ? tokenObj._id.toString() : "",
        name,
        server,
        database,
        tokenPassword,
        tokenExpire,
        googleStorage,
        domain,
        guid,
        personalServerUrl,
        loggingServerUrl,
        security,
        secretKey,
        useSecretKey,
      };

      const mongoConnection = await ConnectionManager.createMongoConnection(
        newBulletKey
      );
      mongoConnection.close();

      // verify user settings

      const insertedBulletKey = await bulletConnection.insertOne(
        SYS_DBS.BULLET_KEYS,
        newBulletKey
      );

      return await ConnectionManager.createMongoConnectionAndSaveInDictionary(
        insertedBulletKey,
        bulletkey
      );
    } catch (ex) {
      throw ex;
    }
  }

  async createBulletKeyFromUserCredentials(bodyTokenAndBulletConnection = {}) {
    const {
      tokenObj,
      body: { email, password },
      bulletkey,
    } = bodyTokenAndBulletConnection;

    const bulletConnection = await this.createBulletKeyAndConenction({
      body: {
        name: email,
        email: email,
        database: email.replace("@", "").replace(".", ""),
        tokenPassword: email,
        useSecretKey: false,
        password: "a1",
        domain: "http://localhost:3006/,http://localhost:4200/",
      },
      bulletkey,
    });
    return bulletConnection;
  }

  async getModulesAndFunctions() {
    const response = await MongoDefaultStore.findDef("zsys-delta", {});
    let name = "";
    const modules = {};
    response.forEach((el) => {
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
    return modules;
  }

  getFunctionFromModule = async (bulletDataKey, module, method) => {
    let moduleObj = bulletDataKey.modules[module];
    if (!moduleObj) {
      moduleObj = store.get("modules");
      if (moduleObj) {
        moduleObj = moduleObj[module];
      }
      if (!moduleObj) {
        const modules = await this.getModulesAndFunctions();
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

  async updateBulletKey(bodyTokenAndBulletConnection = {}) {
    let response = null;

    const { tokenObj, body = {} } = bodyTokenAndBulletConnection;

    if (body.useSecretKey === undefined) {
      throw USER_ERROR.USE_SECRET_KEY;
    }

    if (!body.name) {
      throw USER_ERROR.BULLET_KEY_NAME;
    }
    // if (!body.server) {
    //   throw USER_ERROR.BULLET_KEY_SERVER;
    // }
    if (!body.database) {
      throw USER_ERROR.BULLET_KEY_DATABASE;
    }

    if (!body.tokenPassword) {
      throw USER_ERROR.BULLET_KEY_TOKEN_PASSWORD;
    }

    try {
      const findCriteria = {
        $and: [
          {
            name: body.name,
          },
          {
            _id: {
              $ne: ObjectId(body._id),
            },
          },
        ],
      };

      // console.log(JSON.stringify(findCriteria));

      const bulletKey = await MongoDefaultStore.findOneDef(
        SYS_DBS.BULLET_KEYS,
        findCriteria
      );
      if (bulletKey) {
        // console.log(JSON.stringify(bulletKey));
        throw USER_ERROR.BULLET_KEY_NAME_EXISTS;
      }

      const mongoConnection = await ConnectionManager.createMongoConnection(
        body.server,
        body.database
      );
      mongoConnection.close();

      const bulletObj = body;

      // const response = await MongoQuery.insertOne(xBulletCollection, bulletObj);
      response = await MongoDefaultStore.updateOneObjByIdDef(
        SYS_DBS.BULLET_KEYS,
        bulletObj
      );

      bulletkeysStore.remove(bulletObj.guid);
    } catch (ex) {
      throw ex;
    }
    // console.log('dddf', response);

    return response;
  }

  async deleteBulletKey(bodyTokenAndBulletConnection = {}) {
    const {
      tokenObj,
      body: { _id, guid },
    } = bodyTokenAndBulletConnection;

    // xdatabases.remove(guid);

    const bulletObj = {
      userid: tokenObj._id.toString(),
      _id,
    };

    //todo ; close any existent connection associated with key
    //await ConnectionManager.removeOne(SYS_DBS.BULLET_KEYS, bulletObj);

    await MongoDefaultStore.deleteOneDef(SYS_DBS.BULLET_KEYS, bulletObj);
    bulletkeysStore.remove(_id);
    bulletkeysStore.remove(guid);

    throw new BulletError(USER_ERROR.BULLET_KEY_REMOVED);
  }

  updateBulletKeyRecordConstraints(guid, constraints) {
    const bulletKeyRecord = bulletkeysStore.get(guid);
    if (!bulletKeyRecord) {
      throw new Error("no bullet key record");
    }
    //todo verify if here is a dictoinary
    if (!bulletKeyRecord.constraints) {
      bulletKeyRecord.constraints = {};
    }
    bulletKeyRecord.constraints = {
      ...bulletKeyRecord.constraints,
      ...constraints,
    };
  }

  getBulletKeyRecordFromDictionary(guid) {
    return bulletkeysStore.get(guid);
  }

  async getBulletKey(bodyTokenAndBulletConnection) {
    const {
      body: { id },
    } = bodyTokenAndBulletConnection;
    const bulletKey = await MongoDefaultStore.findOneByIdDef(
      SYS_DBS.BULLET_KEYS,
      id
    );

    return bulletKey;
  }

  async getBulletKeyByGuid(guid) {
    const bulletKey = await MongoDefaultStore.findOneDef(SYS_DBS.BULLET_KEYS, {
      guid,
    });

    return bulletKey;
  }

  async getBulletKeyByName(name) {
    const bulletKey = await MongoDefaultStore.findOneDef(SYS_DBS.BULLET_KEYS, {
      name,
    });

    return bulletKey;
  }

  async getBulletKeys(bodyTokenAndBulletConnection) {
    const { tokenObj } = bodyTokenAndBulletConnection;

    const bulletKeys = await MongoDefaultStore.findDef(SYS_DBS.BULLET_KEYS, {
      userid: tokenObj._id,
    });

    return bulletKeys;
  }

  //#############################

  async saveconstraints(bodyTokenAndBulletConnection = {}) {
    let response = null;

    const { tokenObj, body = {} } = bodyTokenAndBulletConnection;

    if (!body.name) {
      throw USER_ERROR.BULLET_KEY_NAME;
    }
    // if (!body.server) {
    //   throw USER_ERROR.BULLET_KEY_SERVER;
    // }
    if (!body.database) {
      throw USER_ERROR.BULLET_KEY_DATABASE;
    }

    if (!body.tokenPassword) {
      throw USER_ERROR.BULLET_KEY_TOKEN_PASSWORD;
    }

    try {
      const findCriteria = {
        $and: [
          {
            name: body.name,
          },
          {
            _id: {
              $ne: ObjectId(body._id),
            },
          },
        ],
      };

      // console.log(JSON.stringify(findCriteria));

      const bulletKey = await MongoDefaultStore.findOneDef(
        SYS_DBS.BULLET_KEYS,
        findCriteria
      );
      if (bulletKey) {
        // console.log(JSON.stringify(bulletKey));
        throw USER_ERROR.BULLET_KEY_NAME_EXISTS;
      }

      const mongoConnection = await ConnectionManager.createMongoConnection(
        body.server,
        body.database
      );
      mongoConnection.close();

      const bulletObj = body;

      // const response = await MongoQuery.insertOne(xBulletCollection, bulletObj);
      response = await MongoDefaultStore.updateOneObjByIdDef(
        SYS_DBS.BULLET_KEYS,
        bulletObj
      );
    } catch (ex) {
      throw ex;
    }
    // console.log('dddf', response);

    return response;
  }

  async login(body = {}) {
    const { email, password, bulletGuid } = body;

    let bulletDataKey;
    if (bulletGuid) {
      bulletDataKey = await this.getBulletKeyByGuid(bulletGuid);
    } else {
      bulletDataKey = await ConnectionManager.getConnectionForBulletKey(
        bulletGuid
      );
      //todoxxx
    }

    if (!bulletDataKey) {
      throw new Error("USER_NOT_FOUND_NO_BULLET_KEY");
    }

    const response = await userService.login({
      ...body,
      bulletDataKey,
    });
    return response;
  }

  async createRootUser(body = {}) {
    const bulletConnection = await ConnectionManager.getConnectionForBulletKey(
      DEFAULT_DB_KEY
    );
    const response = await userService.createUser({
      body,
      bulletConnection,
    });
    return response;
  }

  async createUser(body = {}) {
    let { bulletKey, email } = body;
    if (!bulletKey) {
      bulletKey = email;
    }
    if (!bulletKey) {
      throw new Error("EMAIL_EMPTY");
    }

    let bulletDataKey;

    // bulletDataKey = await this.getBulletKeyByGuid(bulletKey);
    // bulletDataKey = await this.getBulletKeyByName(bulletKey);
    bulletDataKey = await ConnectionManager.getConnectionForBulletKey(
      bulletKey
    );
    if (!bulletDataKey) {
      return;
    }

    return await userService.createUser({
      body,
      bulletDataKey,
    });
  }
}

module.exports = new ManagementService();
