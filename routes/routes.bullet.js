/* eslint-disable no-underscore-dangle */
const router = require("koa-router")();
// const koaBody = require("koa-body");
// const securityModule = require('../modules/security/security');
const { privateBulletMiddleware } = require("../middleware/middleware");

// const { saveFiles } = require("../file-parser/request-file-parser");

// const Logger = require('../logger/logger');
const bullet = require("../module/bullet/bulletService");
const pdfParser = require("../module/pdf/pdf-parser");

router

  .prefix("/bulletapi/private/bullet/v1")
  .use(privateBulletMiddleware)

  .post("/parsepdfbt", async (ctx) => {
    debugger;
    const { body } = ctx.request;
    const response = await pdfParser.executeParseBtFiles(body.request);
    return response;
  })
  .post("/", async (ctx) => {
    let response = null;
    let body = null;

    if (ctx.request.bbody) {
      return ctx.request.bbody.body;
    } else {
      body = ctx.request.body;
    }
    const { method } = body.collection;

    if (!bullet[method]) {
      throw new Error(`no ${method} method`);
    }

    const { files } = ctx.request;

    if (!files) {
      response = await bullet[method](body);
      return response;
    }

    const { storage } = body;
    if (!storage) {
      throw new Error("please provide the storage settings");
    }

    // const savedFiles = await saveFiles(files, storage);
    // bbody.koa_files = {
    //   files: savedFiles,
    //   deletedFiles: storage.deletedFiles,
    //   replacedFiles: storage.replacedFiles,
    // };

    // const { method } = body;
    // const methodName = `${method}Files`;
    // if (!bullet[methodName]) {
    // throw new Error(`no ${methodName} method`);
    // }

    response = await bullet[method](body);
    return response;
  });

module.exports = router;
