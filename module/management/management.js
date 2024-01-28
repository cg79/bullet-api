/* eslint-disable no-underscore-dangle */
/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-throw-literal */
// https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
// https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens#set-up-our-node-application-(package-json)

const { DEFAULT_DB_KEY } = require("../../constants/constants");

const ConnectionManager = require("../../mongo/mongo-connection-manager");
const MongoDefaultStore = require("../../mongo/mongo-default-store");
// const MongoStore = require("../../mongo/mongo-store");
const USER_ERROR = require("../user/user-errors");
const BulletError = require("../../errors/bulletError");
const { SYS_DBS } = require("../../constants/constants");
const bulletkeysStore = require("./bullet-key-store");
const utils = require("../../utils/utils");
const { ObjectId } = require("mongodb");
const userService = require("../user/user-service");
const cryptoJS = require("node-cryptojs-aes").CryptoJS;
const encryption = require("../../utils/encryption")(cryptoJS);
const MongoStore = require("../../mongo/mongo-store");

class ManagementService {
  async createBulletKey(bbody = {}) {
    const {
      tokenObj,
      body: {
        name,
        email,
        server = "mongodb://localhost:27017",
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
      x_bullet_key,
    } = bbody;

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

    const existingServerDb = await MongoDefaultStore.findDef(
      SYS_DBS.BULLET_KEYS,
      {
        $and: [
          {
            server: server,
          },
          {
            database: database,
          },
        ],
      }
    );
    // console.log(existingServerDb);
    if (existingServerDb && existingServerDb.length) {
      throw USER_ERROR.DATABASE_KEY_EXISTS;
    }

    if (!tokenPassword) {
      throw USER_ERROR.BULLET_KEY_TOKEN_PASSWORD;
    }

    if (!password) {
      throw USER_ERROR.ROOT_USER_PASSWORD;
    }

    const existingKey = await MongoDefaultStore.findOneDef(
      SYS_DBS.BULLET_KEYS,
      { name }
    );
    if (existingKey) {
      throw USER_ERROR.BULLET_KEY_NAME_EXISTS;
    }

    const secretKey = utils.guid();

    // const xBulletCollection = await MongoDefaultStore.collectionRef(SYS_DBS.BULLET_KEYS);

    try {
      const mongoConnection = await ConnectionManager.checkConnectionString(
        server,
        database
      );
      mongoConnection.close();

      // verify user settings

      const guid = utils.guid();

      const bulletObj = {
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

      const response = await MongoDefaultStore.insertDef(
        SYS_DBS.BULLET_KEYS,
        bulletObj
      );

      const userData = {
        email: tokenObj ? tokenObj.email : email,
        password: userService.encryptPassword(
          password,
          bulletObj.tokenPassword
        ),

        bulletGuid: guid,
        isrootuser: true,
      };
      // const bbody = {
      //   body: userData,
      //   bulletDataKey: bulletObj,
      //   isrootuser: true,
      // };
      await MongoDefaultStore.insertDef(SYS_DBS.USERS, userData);
      // await MongoStore.insertStore(guid, SYS_DBS.USERS, userData);

      // const userResponse = userService.createTokenObj(userData, bulletObj);
      return bulletObj;
    } catch (ex) {
      throw ex;
    }
  }

  async findDefaultUserByEmail(email) {
    return await MongoDefaultStore.findOneDef(SYS_DBS.USERS, { email });
  }

  async getModulesAndFunctions() {
    const response = await MongoDefaultStore.findDef("zsys-delta", {});
    debugger;
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
  // async importBulletIoUser(findCriteria) {
  //
  //   const bulletIoUser = await MongoDefaultStore.findByIdDef(
  //     "users",
  //     findCriteria._id
  //   );

  //   // const bulletApiUser = await MongoStore.findByIdDef(SYS_DBS.USERS, findCriteria);
  //   // console.log(bulletIoUser);
  // }

  async updateBulletKey(bbody = {}) {
    let response = null;

    const { tokenObj, body = {} } = bbody;

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

      const mongoConnection = await ConnectionManager.checkConnectionString(
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

  async deleteBulletKey(bbody = {}) {
    const {
      tokenObj,
      body: { _id, guid },
    } = bbody;

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

  async getBulletKey(bbody) {
    const {
      body: { id },
    } = bbody;
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

  async getBulletKeys(bbody) {
    const { tokenObj } = bbody;

    const bulletKeys = await MongoDefaultStore.findDef(SYS_DBS.BULLET_KEYS, {
      userid: tokenObj._id,
    });

    return bulletKeys;
  }

  async page(bbody) {
    const {
      collection,
      page,
      sort,
      flow,
      tokenObj,
      join,
      response,
      bulletDataKey,
    } = bbody;

    return { do: "this" };
  }

  async updateGoogleProvider(bbody = {}) {
    const {
      tokenObj,
      body: { _id },
    } = bbody;
  }

  //#############################

  async saveconstraints(bbody = {}) {
    let response = null;

    const { tokenObj, body = {} } = bbody;

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

      const mongoConnection = await ConnectionManager.checkConnectionString(
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

  async createBulletKeyFromEmail(email) {
    const bulletKey = await this.createBulletKey({
      body: {
        name: email,
        email: email,
        database: email.replace("@", "").replace(".", ""),
        tokenPassword: email,
        useSecretKey: false,
        password: "a1",
        domain: "http://localhost:3006/,http://localhost:4200/",
      },
    });
    return bulletKey;
  }
  async createUserByEmail(body = {}) {
    const { email, password } = body;

    const bulletKey = await this.createBulletKeyFromEmail(email);
    const userData = {
      email,
      password: userService.encryptPassword(password, bulletKey.tokenPassword),

      bulletGuid: bulletKey.guid,
      isrootuser: true,
    };

    await MongoStore.insertStore(bulletKey.guid, SYS_DBS.USERS, userData);

    return userService.createTokenObj(userData, bulletKey);
  }
  async loginOrCreateAccountWithGoogle(body = {}) {
    const { email, password } = body;
    const user = await this.findDefaultUserByEmail(email);
    if (user) {
      if (!user.googleId) {
        await MongoDefaultStore.updateOneDef(
          SYS_DBS.USERS,
          { _id: user._id },
          {
            googleId: password,
          }
        );
        return userService.createUserResponse(user);
      }
      if (user.googleId !== password) {
        throw new Error("wrong password");
      }
      const bulletDataKey = await this.getBulletKeyByName(email);
      return userService.createTokenObj(user, bulletDataKey);
    }
    const response = await this.createUserByEmail(body);
    return response;
  }
  async login(body = {}) {
    const { email, password } = body;
    const user = await this.findDefaultUserByEmail(email);
    debugger;
    if (!user) {
      throw new Error("user not exists");
    }

    const bulletDataKey = await this.getBulletKeyByGuid(user.bulletGuid);
    if (!bulletDataKey) {
      throw new Error("NO BULLET KEY");
    }
    const response = await userService.login({
      body,
      bulletDataKey,
    });
    return response;
  }

  // async loginAgainstMainDb(body = {}) {
  //   const { email, password } = body;
  //   const user = await this.findDefaultUserByEmail(email);
  //   debugger;
  //   if (!user) {
  //     throw new Error("user not exists");
  //   }

  //   const bulletDataKey = await this.getBulletKeyByName(user.bulletGuid);
  //   if (!bulletDataKey) {
  //     throw new Error("NO BULLET KEY");
  //   }
  //   const response = await userService.login({
  //     body,
  //     bulletDataKey,
  //   });
  //   return response;
  // }
}

module.exports = new ManagementService();
