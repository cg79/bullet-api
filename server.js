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
const routesLoggedUserManagement = require("./routes/routes.logged.user.management");

const routesBullet = require("./routes/routes.bullet");
const routesRoot = require("./routes/routes.root");

const Logger = require("./logger/logger");
require("dotenv").config();

let server = null;
var xxx = process.env.PORT || 8080;
console.log(process.env);
global.__basedir = __dirname;

const app = new Koa();

const corsOptions = {
  origin(ctx) {
    if (ctx.url === "/bulletapi/pub/bullet") {
      return "*";
    }
    return "*";
  },
  exposeHeaders: [
    "SECRET_KEY",
    "bulletKey",
    "Server-Authorization",
    "Authorization",
  ],
  credentials: true,
};

app.use(cors(corsOptions));

// app.use(
//   cors({
//     origin(ctx) {
//       if (ctx.url === "/test") {
//         return false;
//       }
//       return "*";
//     },
//     exposeHeaders: ["WWW-Authenticate", "Server-Authorization"],
//     maxAge: 5,
//     credentials: false,
//     allowMethods: ["GET", "POST", "DELETE"],
//     allowHeaders: ["Content-Type", "Authorization", "Accept", "x_bullet_key"],
//   })
// );

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
lcRouter.use(routesRoot.routes());
lcRouter.use(routesUserManagement.routes());
lcRouter.use(routesLoggedUserManagement.routes());

lcRouter.get("/", function (ctx, next) {
  const paths = lcRouter.stack.map((i) => i.path);
  ctx.body = JSON.stringify(paths);
});

lcRouter.get("/uploads/(.*)", async (ctx) => {
  await send(ctx, ctx.path, { root: __dirname });
});

app.use(lcRouter.routes()).use(lcRouter.allowedMethods());

console.log(lcRouter.stack.map((i) => i.path));

// lcRouter.get('/', serve('../dist', { index: 'index.html' }));

// lcRouter.get("/uploads/*", async (ctx) => {
//   await send(ctx, ctx.path);
// });

// lcRouter.get('/plm', async (ctx) => {
//   await send(ctx, ctx.path);
// });

Logger.log(lcRouter.stack.map((i) => i));

const SERVER_PORT = 3002;

// server = app.listen(port).on('error', (err) => {
//   if(err) {
//     // Logger.log('error on listen server', err);
//   } else{
//   }
// });

server = app.listen(SERVER_PORT, () => {
  console.log("Listening on port " + SERVER_PORT);
});

server.stop = () => {
  console.log("CLOSING");
  MongoDefaultStore.close();
  server.close();
};

module.exports = server;

// ------------------------------------+

// smtp.zoho.com
// contact@chessboard24.com
// KU7PzMasKU7PzMas!
