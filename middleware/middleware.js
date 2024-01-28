const { ObjectID } = require("mongodb");
const responseWrapper = require("../response/responseWrapper");
const { verify, verifyToken } = require("../jwt/jwt-helpers");
// const ManagementService = require("../module/management/management");
const MongoStore = require("../mongo/mongo-store");
const { saveFiles } = require("../file-parser/request-file-parser");
const bulletService = require("../module/bullet/bulletService");
const bulletHelpers = require("../module/bullet/bullet-helpers");
const errorService = require("../errors/errors-service");
const utils = require("../utils/utils");

class Middleware {
  parseJwt = function (token) {
    if (!token) {
      throw new Error("token is empty");
    }
    try {
      return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    } catch (ex) {
      throw new Error(`JWT could not be parsed ${ex}`);
    }
  };

  verifyWhiteListedDomain = function (bulletDataKey, origin) {
    return;
    const index = bulletDataKey.domain.indexOf(origin);
    if (index === -1) {
      throw new Error(
        `${origin} is not allowed. please update the whitelist value of the bullet key (root user)`
      );
    }
  };

  //used only for management
  //e.g. create bullet keys
  managementMiddleware = async (ctx, next) => {
    let apiResponse = null;
    let tokenObj = null;
    try {
      const { authorization, origin } = ctx.req.headers;

      const {
        files,
        body,
        body: { collection },
      } = ctx.request;

      if (files) {
        return this.managementMiddlewareWithFiles(ctx, next);
      }

      // const bulletDataKey = await ManagementService.getOrCreateBulletKey(collection.x_bullet_key);
      const tokenObj = await verifyToken(
        authorization,
        "2ENE}4yBZumzjrKs2ENE}4yBZum&6_IApq3AwergJnm2ENccE}4yBZum8!eIU5vqP9L2O4c1"
      );

      const bodyData = body.body || body || {};
      bodyData.modifiedms = new Date().getTime();

      const bbody = {
        body: bodyData,
        collection,
        tokenObj,
        origin,
        // bulletDataKey,
      };

      ctx.request.bbody = bbody;

      apiResponse = await next(); // next is now a function
      ctx.body = responseWrapper.success(apiResponse);
    } catch (err) {
      // console.log(err);
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }

      const dbErr = {
        ...err,
        ...tokenObj,
      };
      delete dbErr._id;
      ctx.body = responseWrapper.failure(err);
    }
  };

  userMmanagementMiddleware = async (ctx, next) => {
    let apiResponse = null;
    try {
      apiResponse = await next(); // next is now a function
      ctx.body = responseWrapper.success(apiResponse);
    } catch (err) {
      // console.log(err);
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }

      const dbErr = {
        ...err,
      };
      delete dbErr._id;
      ctx.body = responseWrapper.failure(err);
    }
  };

  managementMiddlewareWithFiles = async (ctx, next) => {
    let apiResponse = null;
    let tokenObj = null;
    try {
      const { authorization, origin } = ctx.req.headers;
      const tokenObj = await verifyToken(
        authorization,
        "2ENE}4yBZumzjrKs2ENE}4yBZum&6_IApq3AwergJnm2ENccE}4yBZum8!eIU5vqP9L2O4c1"
      );

      const bodyReq = JSON.parse(ctx.request.body.data);
      const {
        collection = {},
        find,
        page,
        sort,
        bodyFields,
        flow,
        log,
        key,
        take,
        response,
        traceStart,
        traceEnd,
        saveForLaterUse,
        name,
        description,
        executeflowByName,
        mergePreviousResultToFlowBody,
        reqid = utils.guid(),
        run,
        merge,
        join,
      } = bodyReq;

      // if (!storage) {
      //   throw new Error("please provide the storage settings");
      // }

      const bbody = {
        body: bodyReq.body,
        collection,
        find,
        page,
        sort,
        bodyFields,
        flow,
        log,
        key,
        take,
        response,
        traceStart,
        traceEnd,
        saveForLaterUse,
        name,
        description,
        executeflowByName,
        mergePreviousResultToFlowBody,
        reqid,
        run,
        merge,
        join,
        origin,
      };

      // if (!collection) {
      //   throw new Error("please provide collection");
      // }
      const { files } = ctx.request;
      const storage = {
        bucket: bodyReq.body.guid,
      };
      const savedFiles = await saveFiles(files, storage);

      const { key: storageKey = "files" } = storage;

      switch (collection.method) {
        case "updateOne": {
          const pushObj = {};
          pushObj[`${storageKey}.list`] = [...savedFiles.list];
          body.push = pushObj;

          // await bulletService.removeDeletedFiles(formRequest);
          break;
        }
        default: {
          //cover the insert as well
          bbody.body[storageKey] = savedFiles;
          break;
        }
      }

      ctx.request.bbody = bbody;

      apiResponse = await next(); // next is now a function
      ctx.body = responseWrapper.success(apiResponse);
    } catch (err) {
      // console.log(err);
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }

      const dbErr = {
        ...err,
        ...tokenObj,
      };
      delete dbErr._id;
      ctx.body = responseWrapper.failure(err);
    }
  };

  //used for bullet calls
  privateBulletMiddleware = async (ctx, next) => {
    let apiResponse = null;
    let tokenObj = null;
    let bulletDataKey = null;
    let bodyData = null;
    try {
      const { authorization, origin, SECRET_KEY } = ctx.req.headers;

      if (!authorization) {
        throw new Error("please provide the token authorization value");
      }

      let bulletDataKey = null;
      const { files, body } = ctx.request;
      if (files) {
        return this.privateBulletMiddlewareWithFiles(ctx, next);
      }

      const tokenData = this.parseJwt(authorization);

      bulletDataKey = await MongoStore.getOrCreateXBulletDatabase(
        tokenData.bkguid
      );
      if (
        bulletDataKey.useSecretKey &&
        SECRET_KEY !== bulletDataKey.secretKey
      ) {
        throw new Error("invalid secret key");
      }

      const index = bulletDataKey.domain.indexOf(origin);
      // if (index === -1) {
      //   throw new Error(
      //     `${origin} is not allowed. please update the whitelist value of the bullet key`
      //   );
      // }

      tokenObj = await verify(authorization, bulletDataKey);

      // bodyData = body.body || body || {};
      body.modifiedms = new Date().getTime();
      body.tokenObj = tokenObj;
      body.bulletDataKey = bulletDataKey;
      body.origin = origin;
      if (!body.reqid) {
        body.reqid = utils.guid();
      }

      // const bbody = {
      //   body: bodyData,
      //   bodyFields,
      //   flow,
      //   log,
      //   key,
      //   collection,
      //   find,
      //   page,
      //   sort,
      //   tokenObj,
      //   take,
      //   response,
      //   traceStart,
      //   traceEnd,
      //   saveForLaterUse,
      //   name,
      //   description,
      //   executeflowByName,
      //   mergePreviousResultToFlowBody,
      //   reqid,
      //   run,
      //   merge,
      //   bulletDataKey,
      //   join,
      //   origin,
      // };
      // ctx.request.bbody = bbody;

      apiResponse = await next(); // next is now a function
      ctx.body = responseWrapper.success(apiResponse);
    } catch (err) {
      // console.log(err);
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }

      const dbErr = errorService.writeErrorToDb(
        err,
        {},
        bulletDataKey,
        tokenObj
      );
      ctx.body = responseWrapper.failure(err);
    }
  };

  createIdOrGuidObj(source) {
    const response = {};

    if (source._id) {
      response._id = source._id;
      return response;
    }

    if (source.guid) {
      response.guid = source.guid;
      return response;
    }

    throw new Error(
      "please provide _id or guid value. expression or regex is not implemented for file updates. sorry? "
    );
  }

  privateBulletMiddlewareWithFiles = async (ctx, next) => {
    let apiResponse = null;
    let tokenObj = null;
    let bulletDataKey = null;
    try {
      const { authorization, origin, SECRET_KEY } = ctx.req.headers;
      // ctx.request.body.tokenObj = r;

      if (!authorization) {
        throw new Error("please provide the token authorization value");
      }

      const body = JSON.parse(ctx.request.body.data);
      const {
        collection,
        find,
        page,
        sort,
        bodyFields,
        flow,
        log,
        key,
        take,
        response,
        traceStart,
        traceEnd,
        saveForLaterUse,
        name,
        description,
        executeflowByName,
        mergePreviousResultToFlowBody,
        reqid = utils.guid(),
        run,
        merge,
        join,
        storage,
        fileOptions,
      } = body;

      const tokenData = this.parseJwt(authorization);
      // console.log(tokenData)
      bulletDataKey = await MongoStore.getOrCreateXBulletDatabase(
        tokenData.bkguid
      );

      if (
        bulletDataKey.useSecretKey &&
        SECRET_KEY !== bulletDataKey.secretKey
      ) {
        throw new Error("invalid secret key");
      }

      this.verifyWhiteListedDomain(bulletDataKey, origin);

      if (!storage) {
        throw new Error("please provide the storage settings");
      }

      if (fileOptions) {
        storage.deletedFiles = fileOptions.deletedFiles;
      }

      tokenObj = await verify(authorization, bulletDataKey);

      const bodyData = body.body || body || {};
      bodyData.modifiedms = new Date().getTime();

      const bbody = {
        body: bodyData,
        bodyFields,
        flow,
        log,
        key,
        collection,
        tokenObj,
        take,
        response,
        traceStart,
        traceEnd,
        saveForLaterUse,
        name,
        description,
        executeflowByName,
        mergePreviousResultToFlowBody,
        reqid,
        run,
        merge,
        storage,
        bulletDataKey,
        origin,
      };

      const { files } = ctx.request;
      let fileResponse = null;
      if (files) {
        const savedFiles = await saveFiles(files, storage, bulletDataKey);
        // bbody.savedFiles = savedFiles;
        bbody.body = {};

        const { key: storageKey = "files", deletedFiles } = storage;
        bbody.body[storageKey] = savedFiles;

        // if (!storage.collection) {
        //   switch (collection.method) {
        //     case "insert": {
        //       // bbody.body[storageKey] = savedFiles;
        //       break;
        //     }
        //     case "updateOne": {
        //       const idOrGuidObj = this.createIdOrGuidObj(bodyData);

        //       await bulletService.removeDeletedFiles(
        //         idOrGuidObj,
        //         storageKey,
        //         collection,
        //         deletedFiles,
        //         tokenObj,
        //         bulletDataKey
        //       );
        //       if (savedFiles.list && savedFiles.list.length) {
        //         const pushObj = {};
        //         pushObj[`${storageKey}.list`] = [...savedFiles.list];
        //         bbody.body["push"] = pushObj;
        //       }
        //       break;
        //     }
        //     default: {
        //     }
        //   }
        // } else {
        //   if (!storage.collection.method) {
        //     storage.collection.method = "insert";
        //   }

        //   const newCollection = {
        //     name: bulletHelpers.getCollectionName(
        //       storage.collection,
        //       tokenObj,
        //       bodyData.guid
        //     ),
        //     method: storage.collection.method,
        //   };

        //   //delete files
        //   const { deletedFiles } = storage;
        //   if (deletedFiles && deletedFiles.length) {
        //     let element = deletedFiles[0];
        //     let deleteKey = "name";
        //     let deleteValues = [];

        //     if (element._id) {
        //       deleteKey = "_id";
        //       deleteValues = deletedFiles.map((el) => ObjectID(el._id));
        //     } else {
        //       deleteValues = deletedFiles.map((el) => el.name);
        //     }

        //     await bulletService.deleteMany({
        //       find: {
        //         in: {
        //           key: deleteKey,
        //           values: deleteValues,
        //         },
        //       },
        //       collection: newCollection,
        //       tokenObj,
        //       bulletDataKey,
        //     });
        //   }

        //   const fileDocuments = [];
        //   savedFiles.list.forEach((el) =>
        //     fileDocuments.push({
        //       name: el,
        //       pidg: bodyData.guid,
        //     })
        //   );

        //   fileResponse = await bulletService[storage.collection.method]({
        //     body: fileDocuments,
        //     collection: newCollection,
        //     tokenObj,
        //     bulletDataKey,
        //   });
        // }
      }

      ctx.request.bbody = bbody;

      apiResponse = await next(); // next is now a function
      if (!fileResponse) {
        ctx.body = responseWrapper.success(apiResponse);
      } else {
        ctx.body = responseWrapper.success({ ...apiResponse, fileResponse });
      }
    } catch (err) {
      // console.log(err);
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }

      errorService.writeErrorToDb(err, {}, bulletDataKey, tokenObj);
      ctx.body = responseWrapper.failure(err);
    }
  };

  privateRootBulletMiddleware = async (ctx, next) => {
    let apiResponse = null;
    let tokenObj = null;
    let bulletDataKey = null;
    try {
      const { authorization, origin } = ctx.req.headers;

      if (!authorization) {
        throw new Error("please provide the token authorization value");
      }
      const {
        files,
        body,
        body: {
          collection,
          find,
          page,
          sort,
          bodyFields,
          flow,
          log,
          key,
          take,
          response,
          traceStart,
          traceEnd,
          saveForLaterUse,
          name,
          description,
          executeflowByName,
          mergePreviousResultToFlowBody,
          reqid = utils.guid(),
          run,
          merge,
          join,
        },
      } = ctx.request;
      if (files) {
        return this.privateBulletMiddlewareWithFiles(ctx, next);
      }

      // if(!x_bullet_key) {
      //
      //   throw 'Please provide x_bullet_key'
      // }

      const tokenData = this.parseJwt(authorization);
      // console.log(tokenData)

      bulletDataKey = await MongoStore.getOrCreateXBulletDatabase(
        tokenData.bkguid
      );

      this.verifyWhiteListedDomain(bulletDataKey, origin);

      const tokenObj = await verify(authorization, bulletDataKey);
      // if (!tokenObj.isrootuser) {
      //   throw new Error("only root users are allowed to access the route");
      // }

      const bodyData = body.body || body || {};
      bodyData.modifiedms = new Date().getTime();

      const bbody = {
        body: bodyData,
        bodyFields,
        flow,
        log,
        key,
        collection,
        find,
        page,
        sort,
        tokenObj,
        take,
        response,
        traceStart,
        traceEnd,
        saveForLaterUse,
        name,
        description,
        executeflowByName,
        mergePreviousResultToFlowBody,
        reqid,
        run,
        merge,
        bulletDataKey,
        join,
        origin,
      };
      ctx.request.bbody = bbody;

      apiResponse = await next(); // next is now a function
      ctx.body = responseWrapper.success(apiResponse);
    } catch (err) {
      // console.log(err);
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }

      const dbErr = errorService.writeErrorToDb(
        err,
        {},
        bulletDataKey,
        tokenObj
      );
      ctx.body = responseWrapper.failure(err);
    }
  };

  // collection.x_bullet_key is required because you have to know the database
  // used for login
  publicIdentityMiddleware = async (ctx, next) => {
    let executionResult = null;
    let tokenObj = null;
    let bulletDataKey = null;
    try {
      const { authorization = "965974f49a453ffdc9e04f8bf3d94b40", origin } =
        ctx.req.headers;

      if (!authorization) {
        throw new Error("Please provide the autorization key value");
      }

      let bulletDataKey = null;
      if (authorization.length > 35) {
        const tokenData = this.parseJwt(authorization);
        bulletDataKey = await MongoStore.getOrCreateXBulletDatabase(
          tokenData.bkguid
        );
      } else {
        bulletDataKey = await MongoStore.getOrCreateXBulletDatabase(
          authorization
        );
      }

      this.verifyWhiteListedDomain(bulletDataKey, origin);

      // console.log(bulletDataKey);

      const { body } = ctx.request;
      body.modifiedms = new Date().getTime();

      const bbody = {
        body,
        bulletDataKey,
      };

      // bbody.body.modifiedms = new Date().getTime();
      ctx.request.bbody = bbody;

      executionResult = await next();

      ctx.body = responseWrapper.success(executionResult);
    } catch (err) {
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }
      ctx.body = responseWrapper.failure(err);
    }
  };

  privateIdentityMiddleware = async (ctx, next) => {
    let executionResult = null;
    let tokenObj = null;
    let bulletDataKey = null;
    try {
      const { authorization, origin } = ctx.req.headers;

      if (!authorization) {
        throw new Error("please provide the token authorization value");
      }

      const tokenData = this.parseJwt(authorization);

      const bulletDataKey = await MongoStore.getOrCreateXBulletDatabase(
        tokenData.bkguid
      );

      this.verifyWhiteListedDomain(bulletDataKey, origin);
      // console.log(bulletDataKey)
      tokenObj = await verify(authorization, bulletDataKey);

      const { body = {} } = ctx.request;
      const bodyData = body.body || body;
      bodyData.modifiedms = new Date().getTime();

      const bbody = {
        body: bodyData,
        bulletDataKey,
        tokenObj,
        origin,
      };

      // bbody.body.modifiedms = new Date().getTime();
      ctx.request.bbody = bbody;

      executionResult = await next();

      ctx.body = responseWrapper.success(executionResult);
    } catch (err) {
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }
      ctx.body = responseWrapper.failure(err);
    }
  };

  publicApiExampleMiddleware = async (ctx, next) => {
    let executionResult = null;
    try {
      const { body } = ctx.request;
      executionResult = await next();
      ctx.body = responseWrapper.success(executionResult);
    } catch (err) {
      if (err.name === "BulletError") {
        ctx.body = responseWrapper.successMessage(err);
        return;
      }
      ctx.body = responseWrapper.failure(err);
    }
  };
}

module.exports = new Middleware();
