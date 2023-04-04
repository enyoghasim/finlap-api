import express, { Express, NextFunction, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import Mongoose from "./controllers/mongoose";
import Routes from "./routes/index";
import session from "express-session";
import MongoStore from "connect-mongo";

const server = (): void => {
  const app: Express = express();
  dotenv.config();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(__dirname + "/public"));

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": [
            "'self'",
            "'unsafe-inline'",
            "https://cdnjs.cloudflare.com",
          ],
          "connect-src": ["'self'", "*"],
        },
      },
    })
  );

  app.disable("x-powered-by");

  /* compression is used to compress the response body */
  app.use(compression());

  /* cors is used to allow cross origin requests */
  app.use(cors());

  app.set("trust proxy", 1); // trust first proxy

  const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI!,
    collectionName: "sessions",
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: true,
      store: sessionStore,
      cookie: {
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
        sameSite: true,
        // set max age to 30mins
        maxAge: 30 * 60 * 1000,
      },
    })
  );

  app.get("/health", (_, res: Response) => {
    return res.status(200).json({
      status: "success",
      message: "easy win api is up and running 🚀",
    });
  });

  app.use("/api", Routes);

  const db = new Mongoose();
  db.connect()
    .then(async (e: any) => {
      const port = process.env.PORT || 3000;

      console.log(e);

      const httpServer: any = app.listen(port, () => {
        console.log(`[Server] started on  http://localhost:${port}`);
      });

      httpServer.setTimeout = 605 * 1000; // 605 seconds

      /*
       * Ensure all inactive connections are terminated by the ALB,
       * by setting this a few seconds higher than the ALB idle timeout
       */
      httpServer.keepAliveTimeout = 605 * 1000; // 605 seconds
      httpServer.headersTimeout = 606 * 1000;
    })

    .catch((e: any) => {
      console.log(e);
    });
};

export default server;
