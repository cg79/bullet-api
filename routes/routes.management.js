const router = require("koa-router")();

const Logger = require("../logger/logger");
const { managementMiddleware } = require("../middleware/middleware");
const managementModule = require("../module/management/management");

router
  .prefix("/bulletapi/logged/management/v1")
  .use(managementMiddleware)

  .post("/createBulletKey", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await managementModule.createBulletKey(bbody);
    return response;
  })

  .post("/updateBulletKey", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await managementModule.updateBulletKey(bbody);
    return response;
  })

  .post("/getBulletKey", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await managementModule.getBulletKey(bbody);
    return response;
  })

  .post("/getBulletKeys", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await managementModule.getBulletKeys(bbody);
    return response;
  })

  .post("/deleteBulletKey", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await managementModule.deleteBulletKey(bbody);
    return response;
  })

  .post("/page", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await managementModule.page(bbody);
    return response;
  })

  .post("/updateGoogleProvider", async (ctx) => {
    const { bbody } = ctx.request;
    const response = await managementModule.deleteBulletKey(bbody);
    return response;
  })

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { body } = ctx.request;
    return body;
  });

module.exports = router;
