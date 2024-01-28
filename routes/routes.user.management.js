const router = require("koa-router")();

const Logger = require("../logger/logger");
const { userMmanagementMiddleware } = require("../middleware/middleware");
const managementModule = require("../module/management/management");
const userService = require("../module/user/user-service");

router
  .prefix("/bulletapi/management/v1")
  .use(userMmanagementMiddleware)

  .post("/createUser", async (ctx) => {
    const { body } = ctx.request;
    const response = await managementModule.createUserByEmail(body);
    return response;
  })
  .post("/createGoogleUser", async (ctx) => {
    const { body } = ctx.request;
    const response = await managementModule.loginOrCreateAccountWithGoogle(
      body
    );
    return response;
  })
  .post("/login", async (ctx) => {
    debugger;
    const { body } = ctx.request;
    const response = await managementModule.login(body);
    return response;
  })
  .post("/loginWithGoogle", async (ctx) => {
    const { body } = ctx.request;
    const response = await managementModule.loginOrCreateAccountWithGoogle(
      body
    );
    return response;
  })

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { body } = ctx.request;
    return body;
  });

module.exports = router;
