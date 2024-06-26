const router = require("koa-router")();

const Logger = require("../logger/logger");
const { privateIdentityMiddleware } = require("../middleware/middleware");
const bulletService = require("../module/bullet/bulletService");
const userModule = require("../module/user/user-service");

router
  .prefix("/bulletapi/logged-user")
  .use(privateIdentityMiddleware)

  .post("/changePassword", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userModule.changePassword(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/deleteUser", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userModule.deleteAccount(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/logout", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userModule.logout(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/update", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection, body } = ctx.request;
    const response = await userModule.update(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/inactivate", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userModule.inactivate(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/activate", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userModule.activate(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/delete", async (ctx) => {
    debugger;
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await userModule.deleteAccount(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/executedeltafunction", async (ctx) => {
    Logger.enabled = true;
    const { bodyTokenAndBulletConnection } = ctx.request;
    bodyTokenAndBulletConnection.deltaFunction =
      bodyTokenAndBulletConnection.body;
    const response = await bulletService.executedeltafunction(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/functions", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const { bulletConnection } = bodyTokenAndBulletConnection;
    const { bulletDataKey } = bulletConnection;

    bodyTokenAndBulletConnection.page = bodyTokenAndBulletConnection.body.page;
    if (bodyTokenAndBulletConnection.body.sort) {
      bodyTokenAndBulletConnection.sort =
        bodyTokenAndBulletConnection.body.sort;
    }

    bodyTokenAndBulletConnection.collection = {
      name: `zsys-delta`,
    };
    const response = await bulletService.page(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { bodyTokenAndBulletConnection } = ctx.request;
    return bodyTokenAndBulletConnection;
  });

module.exports = router;
