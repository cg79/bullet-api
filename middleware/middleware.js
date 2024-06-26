const { ObjectID } = require("mongodb");
const responseWrapper = require("../response/responseWrapper");
const { verify, verifyToken } = require("../jwt/jwt-helpers");
const { saveFiles } = require("../file-parser/request-file-parser");
const errorService = require("../errors/errors-service");
const utils = require("../utils/utils");
const ConnectionManager = require("../mongo/mongo-connection-manager");
const { DEFAULT_DB_KEY } = require("../constants/constants");

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

  publicIdentityMiddleware = async (ctx, next) => {
    let executionResult = null;
    let tokenObj = null;
    try {
      const { authorization, origin } = ctx.req.headers;

      const bulletConnection =
        await ConnectionManager.getConnectionForBulletKey(DEFAULT_DB_KEY);
      const { bulletDataKey } = bulletConnection;

      this.verifyWhiteListedDomain(bulletDataKey, origin);
      // console.log(bulletDataKey)
      // const tokenData = this.parseJwt(authorization);
      if (authorization) {
        tokenObj = await verify(authorization, bulletDataKey);
      }

      const { body = {} } = ctx.request;
      const bodyData = body.body || body;
      bodyData.modifiedms = new Date().getTime();

      const bodyTokenAndBulletConnection = {
        ...body,
        bulletConnection,
        tokenObj,
        origin,
      };

      ctx.request.bodyTokenAndBulletConnection = bodyTokenAndBulletConnection;

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
    try {
      const { authorization, origin } = ctx.req.headers;

      if (!authorization) {
        throw new Error("please provide the token authorization value");
      }

      const tokenData = this.parseJwt(authorization);

      const bulletConnection =
        await ConnectionManager.getConnectionForBulletKey(tokenData.bulletKey);
      const { bulletDataKey } = bulletConnection;

      this.verifyWhiteListedDomain(bulletDataKey, origin);
      // console.log(bulletDataKey)
      tokenObj = await verify(authorization, bulletDataKey);

      const { body = {} } = ctx.request;
      const bodyData = body.body || body;
      bodyData.modifiedms = new Date().getTime();

      const bodyTokenAndBulletConnection = {
        ...body,
        bulletConnection,
        tokenObj,
        origin,
      };

      // bodyTokenAndBulletConnection.body.modifiedms = new Date().getTime();
      ctx.request.bodyTokenAndBulletConnection = bodyTokenAndBulletConnection;

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
