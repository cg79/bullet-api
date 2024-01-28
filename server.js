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

// lcRouter.get('/', serve('../dist', { index: 'index.html' }));

// lcRouter.get("/uploads/*", async (ctx) => {
//   await send(ctx, ctx.path);
// });

// lcRouter.get('/plm', async (ctx) => {
//   await send(ctx, ctx.path);
// });

Logger.log(lcRouter.stack.map((i) => i));

const SERVER_PORT = 3002;

const port = SERVER_PORT || 3002;
// server = app.listen(port).on('error', (err) => {
//   if(err) {
//     // Logger.log('error on listen server', err);
//   } else{
//   }
// });

server = app.listen(port, () => {
  console.log("Listening on port " + port);
});

// const ioSocket = require('./modules/socket/ioSocket');
// ioSocket.connect(server);

// const MONGO_URI = 'mongodb://testUser:xyz1234!a@localhost:27017/patagonia';
// const MONGO_URI = 'mongodb://testUser:xyz1234!a@localhost:27017';
// const MONGO_URI = 'mongodb://localhost:27017/patagonia4';
// MongoQuery.connect(MONGO_URI);

// this is GOOD
// MongoQuery.connect('mongodb://testuser1:xyz123456@localhost:27017', 'patagonia');
// MongoQuery.connect('mongodb://localhost:27017', 'patagonia4').then((dbConnection) => {
//   server.stop = function () {
//     MongoQuery.close();
//     server.close();
//   };
// });

// const uri = 'mongodb+srv://claudiu:478hBdTuFgteZPR@cluster0.cs95q.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
// MongoQuery.connect(uri).then((dbConnection) => {
//   console.log('connected');
//   server.stop = function () {
//     console.log('CLOSING');
//     MongoQuery.close();
//     server.close();
//   };
// });
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

server.stop = () => {
  console.log("CLOSING");
  MongoDefaultStore.close();
  server.close();
};

module.exports = server;

// cryptoSocket.start();

// ------------------------------------+

// smtp.zoho.com
// contact@chessboard24.com
// KU7PzMasKU7PzMas!
