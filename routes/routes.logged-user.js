const router = require("koa-router")();

const Logger = require("../logger/logger");
const { privateIdentityMiddleware } = require("../middleware/middleware");
const bulletService = require("../module/bullet/bulletService");
const userModule = require("../module/user/user-service");

router
  .prefix("/bulletapi/logged-user/v1")
  .use(privateIdentityMiddleware)

  .post("/changePassword", async (ctx) => {
    Logger.enabled = true;
    const { bbody } = ctx.request;
    const response = await userModule.changePassword(bbody);
    return response;
  })

  .post("/logout", async (ctx) => {
    Logger.enabled = true;
    const { bbody } = ctx.request;
    const response = await userModule.logout(bbody);
    return response;
  })

  .post("/update", async (ctx) => {
    Logger.enabled = true;
    const { bbody, body } = ctx.request;
    const response = await userModule.update(bbody);
    return response;
  })

  .post("/inactivate", async (ctx) => {
    Logger.enabled = true;
    const { bbody } = ctx.request;
    const response = await userModule.inactivate(bbody);
    return response;
  })

  .post("/activate", async (ctx) => {
    Logger.enabled = true;
    const { bbody } = ctx.request;
    const response = await userModule.activate(bbody);
    return response;
  })

  .post("/delete", async (ctx) => {
    Logger.enabled = true;
    const { bbody } = ctx.request;
    const response = await userModule.delete(bbody);
    return response;
  })

  .post("/executedeltafunction", async (ctx) => {
    Logger.enabled = true;
    const { bbody } = ctx.request;
    bbody.deltaFunction = bbody.body;
    const response = await bulletService.executedeltafunction(bbody);
    return response;
  })

  .post("/functions", async (ctx) => {
    const { bbody } = ctx.request;
    const { bulletDataKey } = bbody;
    bbody.page = bbody.body.page;
    if (bbody.body.sort) {
      bbody.sort = bbody.body.sort;
    }

    bbody.collection = {
      name: `zsys-delta`,
    };
    const response = await bulletService.page(bbody);
    return response;
  })

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { bbody } = ctx.request;
    return bbody;
  });

module.exports = router;
