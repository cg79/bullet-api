const router = require("koa-router")();

// const Logger = require("../logger/logger");
const { privateRootBulletMiddleware } = require("../middleware/middleware");
const userService = require("../module/user/user-service");
const constraintsModule = require("../module/security/constraints");
const bulletService = require("../module/bullet/bulletService");
const errorLogsService = require("../module/security/error-logs-service");
const ManagementService = require("../module/management/management");

router
  .prefix("/bulletapi/root/v1")
  .use(privateRootBulletMiddleware)

  .post("/createrootuser", async (ctx) => {
    debugger;
    const { bbody } = ctx.request;
    const response = await userService.createRootUser(bbody);
    return response;
  })

  .post("/collections", async (ctx) => {
    let response = null;
    let bbody = null;

    bbody = ctx.request.bbody;
    const method = "getCollections";

    if (!bulletService[method]) {
      throw new Error(`no ${method} method`);
    }

    // const { method } = body;
    // const methodName = `${method}Files`;
    // if (!bulletService[methodName]) {
    // throw new Error(`no ${methodName} method`);
    // }

    response = await bulletService[method](bbody);
    return response;
  })

  .post("/saveconstraints", async (ctx) => {
    const {
      bbody,
      bbody: { body, tokenObj, bulletDataKey },
    } = ctx.request;

    const response = await constraintsModule.update(bbody);

    // console.log(body);

    const { name, constraints, collection } = body;
    const newConstraints = {};
    newConstraints[collection] = constraints;

    ManagementService.updateBulletKeyRecordConstraints(
      tokenObj.bkguid,
      newConstraints
    );
    return response;
  })

  .post("/getconstraints", async (ctx) => {
    const { bbody } = ctx.request;

    const response = await await constraintsModule.getAll(bbody);
    return response;
  })

  .post("/registerupdatedeltafunction", async (ctx) => {
    const {
      bbody,
      bbody: { body, tokenObj, bulletDataKey },
    } = ctx.request;

    const response = await bulletService.registerupdatedeltafunction(bbody);

    return response;
  })

  .post("/removedeltafunction", async (ctx) => {
    const {
      bbody,
      bbody: { body, tokenObj, bulletDataKey },
    } = ctx.request;

    const response = await bulletService.removedeltafunction(bbody);

    return response;
  })

  .post("/getdeltafunctions", async (ctx) => {
    const { bbody } = ctx.request;

    const response = await await constraintsModule.getAll(bbody);
    return response;
  })

  .post("/users", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await userService.users(bbody);
    return response;
  })

  .post("/errors", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await errorLogsService.errors(bbody);
    return response;
  })

  .post("/ping", async (ctx) => {
    const { bbody } = ctx.request;
    const response = { ping: 1 };
    return response;
  });

module.exports = router;
