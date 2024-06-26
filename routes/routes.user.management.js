const router = require("koa-router")();

// const Logger = require("../logger/logger");
const { privateIdentityMiddleware } = require("../middleware/middleware");
const managementModule = require("../module/management/management");
// const userService = require("../module/user/user-service");

router
  .prefix("/bulletapi/management")
  .use(privateIdentityMiddleware)

  .post("/createUser", async (ctx) => {
    const { body } = ctx.request;
    const response = await managementModule.createUser(body);
    return response;
  })
  .post("/createRootUser", async (ctx) => {
    const { body } = ctx.request;
    const response = await managementModule.createRootUser(body);
    return response;
  })
  // .post("/deleteUser", async (ctx) => {
  //   const { body } = ctx.request;
  //   const response = await managementModule.deleteAccount(body);
  //   return response;
  // })
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
    debugger;
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
