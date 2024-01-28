const router = require("koa-router")();

// const Logger = require("../logger/logger");
// const userModule = require("../module/user/user-service");
const { publicApiExampleMiddleware } = require("../middleware/middleware");

router
  .prefix("/bulletapi/public/v1")
  .use(publicApiExampleMiddleware)

  .post("/currentdate", async (ctx) => {
    return {
      date: new Date(),
    };
  })

  .post("/ping", async (ctx) => {
    // Logger.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
    const { body } = ctx.request;
    return body;
  });

module.exports = router;
