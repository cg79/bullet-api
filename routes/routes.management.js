const router = require("koa-router")();

const Logger = require("../logger/logger");
const { privateIdentityMiddleware } = require("../middleware/middleware");
const managementModule = require("../module/management/management");

router
  .prefix("/bulletapi/logged/management")
  .use(privateIdentityMiddleware)

  .post("/createBulletKey", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await managementModule.createBulletKeyAndConenction(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/updateBulletKey", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await managementModule.updateBulletKey(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/getBulletKey", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await managementModule.getBulletKey(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/getBulletKeys", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await managementModule.getBulletKeys(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/deleteBulletKey", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await managementModule.deleteBulletKey(
      bodyTokenAndBulletConnection
    );
    return response;
  })
  .post("/deleteaccount", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    debugger;
    const response = await managementModule.deleteAccount(
      bodyTokenAndBulletConnection
    );
    return response;
  })

  .post("/page", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await managementModule.page(bodyTokenAndBulletConnection);
    return response;
  })

  .post("/updateGoogleProvider", async (ctx) => {
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await managementModule.deleteBulletKey(
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
