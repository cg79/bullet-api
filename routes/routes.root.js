const router = require("koa-router")();

// const Logger = require("../logger/logger");
const { privateIdentityMiddleware } = require("../middleware/middleware");
const userService = require("../module/user/user-service");
const constraintsModule = require("../module/security/constraints");
const bulletService = require("../module/bullet/bulletService");
const errorLogsService = require("../module/security/error-logs-service");
const ManagementService = require("../module/management/management");

router
  .prefix("/bulletapi/root")
  .use(privateIdentityMiddleware)

  .post("/createrootuser", async (ctx) => {
    debugger;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userService.createRootUser(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/collections", async (ctx) => {
    let response = null;
    let bodyTokenAndBulletConnection = null;

    bodyTokenAndBulletConnection = ctx.request.bodyTokenAndBulletConnection;
    const method = "getCollections";

    if (!bulletService[method]) {
      throw new Error(`no ${method} method`);
    }

    // const { method } = body;
    // const methodName = `${method}Files`;
    // if (!bulletService[methodName]) {
    // throw new Error(`no ${methodName} method`);
    // }

    response = await bulletService[method](bodyTokenAndBulletConnection);
    return response;
  })

  .post("/saveconstraints", async (ctx) => {
    const {
      bodyTokenAndBulletConnection,
      bodyTokenAndBulletConnection: { body, tokenObj, bulletDataKey },
    } = ctx.request;

    const response = await constraintsModule.update(
      bodyTokenAndBulletConnection
    );

    // console.log(body);

    const { name, constraints, collection } = body;
    const newConstraints = {};
    newConstraints[collection] = constraints;

    ManagementService.updateBulletKeyRecordConstraints(
      tokenObj.bulletKey,
      newConstraints
    );
    return response;
  })

  .post("/getconstraints", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;

    const response = await await constraintsModule.getAll(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/removedeltafunction", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;

    const response = await bulletService.removedeltafunction(
      bodyTokenAndBulletConnection
    );

    return response;
  })

  .post("/registerUpdateMainDeltaFunction", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;

    const response = await bulletService.registerUpdateMainDeltaFunction(
      bodyTokenAndBulletConnection
    );

    return response;
  })

  .post("/getMainDeltaFunctions", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;

    const response = await bulletService.getMainDeltaFunctions(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/users", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userService.users(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/errors", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await errorLogsService.errors(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/ping", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = { ping: 1 };
    return response;
  });

module.exports = router;
