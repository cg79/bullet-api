/* eslint-disable func-names */
/* eslint-disable no-console */
/* eslint-disable no-undef */
const Koa = require("koa");

const lcRouter = require("koa-router")();
const send = require("koa-send");
const koaBody = require("koa-body");
// const serve = require('koa2-static-middleware');
// const Helmet = require('koa-helmet');
const cors = require("koa2-cors");

const userRoutes = require("./routes/routes.user");
const userLoggedRoutes = require("./routes/routes.logged-user");
const routesManagement = require("./routes/routes.management");
const routesUserManagement = require("./routes/routes.user.management");
const routesBullet = require("./routes/routes.bullet");
const routesPing = require("./routes/routes.ping");
const routesPublic = require("./routes/routes.public");
const routesRoot = require("./routes/routes.root");

const Logger = require("./logger/logger");
const MongoDefaultStore = require("./mongo/mongo-default-store");

let server = null;

global.__basedir = __dirname;

const app = new Koa();

const corsOptions = {
  origin(ctx) {
    if (ctx.url === "/bulletapi/pub/bullet") {
      return "*";
    }
    return "*";
  },
  exposeHeaders: ["SECRET_KEY", "Server-Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(cors());

app.use(
  koaBody({
    multipart: true,
    formidable: {
      maxFileSize: 1000 * 1024 * 1024,
    },
  })
);

// app.use(Helmet());

lcRouter.use(userRoutes.routes());
lcRouter.use(userLoggedRoutes.routes());
lcRouter.use(routesManagement.routes());
lcRouter.use(routesBullet.routes());
lcRouter.use(routesPing.routes());
lcRouter.use(routesPublic.routes());
lcRouter.use(routesRoot.routes());
lcRouter.use(routesUserManagement.routes());

lcRouter.get("/", function (ctx, next) {
  const paths = lcRouter.stack.map((i) => i.path);
  ctx.body = JSON.stringify(paths);
});

lcRouter.get("/uploads/(.*)", async (ctx) => {
  await send(ctx, ctx.path, { root: __dirname });
});

app.use(lcRouter.routes()).use(lcRouter.allowedMethods());

Logger.log(lcRouter.stack.map((i) => i));

const SERVER_PORT = 3002;

const port = SERVER_PORT || 3002;

server = app.listen(port, () => {
  console.log("Listening on port " + port);
});

server.stop = () => {
  console.log("CLOSING");
  MongoDefaultStore.close();
  server.close();
};

module.exports = server;
