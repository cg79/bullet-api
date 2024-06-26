/* eslint-disable no-underscore-dangle */
const router = require("koa-router")();
// const koaBody = require("koa-body");
// const securityModule = require('../modules/security/security');
const { publicIdentityMiddleware } = require("../middleware/middleware");

// const { saveFiles } = require("../file-parser/request-file-parser");

// const Logger = require('../logger/logger');
const bullet = require("../module/bullet/bulletService");
const methodExecution = require("../module/bullet/method-execution");
const pdfParser = require("../module/pdf/pdf-parser");

router

  .prefix("/bulletapi/private/bullet")
  .use(publicIdentityMiddleware)

  .post("/executeMethodFromModule", async (ctx) => {
    debugger;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await methodExecution.executeMethodFromModule(
      bodyTokenAndBulletConnection
    );
    return response;
  })
  .post("/parsepdfbt", async (ctx) => {
    debugger;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const response = await pdfParser.executeParseBtFiles(
      bodyTokenAndBulletConnection.body.request
    );
    return response;
  })
  .post("/", async (ctx) => {
    debugger;
    let response = null;
    const { bodyTokenAndBulletConnection } = ctx.request;
    const {
      collection: { method },
    } = bodyTokenAndBulletConnection;

    // if (ctx.request.bodyTokenAndBulletConnection) {
    //   return ctx.request.bodyTokenAndBulletConnection.body;
    // } else {
    //   body = ctx.request.body;
    // }
    // const { method } = body.collection;

    if (!bullet[method]) {
      throw new Error(`no ${method} method`);
    }

    const { files } = ctx.request;

    if (!files) {
      response = await bullet[method](bodyTokenAndBulletConnection);
      return response;
    }

    const { storage } = body;
    if (!storage) {
      throw new Error("please provide the storage settings");
    }

    // const savedFiles = await saveFiles(files, storage);
    // bodyTokenAndBulletConnection.koa_files = {
    //   files: savedFiles,
    //   deletedFiles: storage.deletedFiles,
    //   replacedFiles: storage.replacedFiles,
    // };

    // const { method } = body;
    // const methodName = `${method}Files`;
    // if (!bullet[methodName]) {
    // throw new Error(`no ${methodName} method`);
    // }

    response = await bullet[method](bodyTokenAndBulletConnection);
    return response;
  });

module.exports = router;
