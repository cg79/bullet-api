const router = require("koa-router")();

// const Logger = require("../logger/logger");
const { privateIdentityMiddleware } = require("../middleware/middleware");
const managementModule = require("../module/management/management");
// const userService = require("../module/user/user-service");

router
  .prefix("/bulletapi/logged-user/management")
  .use(privateIdentityMiddleware)

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { body } = ctx.request;
    return body;
  });

module.exports = router;
