const router = require("koa-router")();

const Logger = require("../logger/logger");
const { publicIdentityMiddleware } = require("../middleware/middleware");
const userModule = require("../module/user/user-service");

router
  .prefix("/bulletapi/user/v1")
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
    const { bbody, body } = ctx.request;
    const response = await userModule.createUser(bbody);
    return response;
  })

  .post("/createUserAndLogin", async (ctx) => {
    Logger.enabled = true;
    const { bbody, body } = ctx.request;
    const response = await userModule.createUserAndLogin(bbody);
    return response;
  })

  .post("/login", async (ctx) => {
    Logger.enabled = true;
    const { bbody, body } = ctx.request;
    const response = await userModule.login(bbody);
    return response;
  })

  .post("/forgotPassword", async (ctx) => {
    Logger.enabled = true;
    const { bbody, body } = ctx.request;
    const response = await userModule.forgotPassword(bbody);
    return response;
  })

  .post("/confirm", async (ctx) => {
    Logger.enabled = true;
    const { bbody, body } = ctx.request;
    const response = await userModule.confirm(bbody);
    return response;
  })

  .post("/resetPassword", async (ctx) => {
    Logger.enabled = true;
    const { bbody, body } = ctx.request;
    const response = await userModule.resetPassword(bbody);
    return response;
  })

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { body } = ctx.request;
    return body;
  });

module.exports = router;
