const router = require("koa-router")();

// const Logger = require('../logger/logger');
// const { publicMiddleware } = require('../middleware/middleware');
// const userModule = require('../module/user/user');

router
  // .prefix('/bulletapi/ping')
  .get("/ping", async (ctx) => {
    // Logger.log("ruta public");

    ctx.body = "Hello ping";

    // ctx.body = responseWrapper.success(resp);
  });

module.exports = router;
