const router = require("koa-router")();

const Logger = require("../logger/logger");
const { publicIdentityMiddleware } = require("../middleware/middleware");
const management = require("../module/management/management");
const userModule = require("../module/user/user-service");

router
  .prefix("/bulletapi/user")
  .use(publicIdentityMiddleware)
  .get("/", async (ctx) => {
    // Logger.log("ruta public");

    const { body } = ctx.request;
    const { data } = body;
    const { method } = body.proxy;

    const resp = await userModule[method](data, body.tokenObj);
    return resp;

    // ctx.body = responseWrapper.success(resp);
  })

  .post("/createUser", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection, body } = ctx.request;
    if (!bodyTokenAndBulletConnection.bulletConnection) {
      //create a bulletKey connection to another database
      bodyTokenAndBulletConnection.bulletConnection =
        await management.createBulletKeyFromUserCredentials(
          bodyTokenAndBulletConnection
        );
    }
    const response = await userModule.createUser(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/login", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection, body } = ctx.request;
    if (!bodyTokenAndBulletConnection.bulletConnection) {
      debugger;
      //create a bulletKey connection to another database
      bodyTokenAndBulletConnection.bulletConnection =
        await management.createBulletKeyFromUserCredentials(
          bodyTokenAndBulletConnection
        );
    }
    const response = await userModule.login(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/forgotPassword", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection, body } = ctx.request;
    const response = await userModule.forgotPassword(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/confirm", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection, body } = ctx.request;
    const response = await userModule.confirm(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/resetPassword", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection, body } = ctx.request;
    const response = await userModule.resetPassword(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { body } = ctx.request;
    return body;
  });

module.exports = router;
