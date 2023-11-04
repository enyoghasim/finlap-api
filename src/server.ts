import express, { Express, NextFunction, Response } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import Mongoose from "./controllers/mongoose";
import Routes from "./routes/index";
import session, { SessionData } from "express-session";
import sessionStore from "./controllers/session";
import { sendSuccessResponse } from "./utils/response";
import Flutterwave from "./service/flutterwave";

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
    return sendSuccessResponse(
      res,
      200,
      null,
      "finlap api is up and running 🚀"
    );
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

      httpServer.setTimeout = 605 * 1000;
      httpServer.keepAliveTimeout = 605 * 1000;
      httpServer.headersTimeout = 606 * 1000;
    })
    // .then(async () => {
    //   const flutterwave = new Flutterwave();

    //   const banks = await flutterwave.createVirtualAccountNumber({
    //     bvn: "12345678001",
    //     email: "eex@xee.xdo",
    //   });
    //   // const banks = await flutterwave.getBanks();

    //   if (banks.status === "success") {
    //     console.log("banks fetched successfully");
    //     console.log(banks.data);
    //   } else {
    //     console.log("unable to fetch banks");
    //   }
    // })

    // TODO - LOGOUT USERS FROM ALL OTHER SESSIONS AFTER A SUCCESSFULL PASSWORD CHANGE

    // .then((e: any) => {
    //   sessionStore.all((err, sessions) => {
    //     if (err) {
    //       console.log(err);
    //     } else {
    //       if (!sessions || !sessions.length || !Array.isArray(sessions)) {
    //         return;
    //       }
    //       sessions.forEach((session) => {
    //         const sessionData = session as unknown as SessionData;
    //         const sessionId = sessionData.sessionID;
    //         // if (session.user === user._id.toString()) {
    //         //   sessionStore.destroy(session.sessionId, (err) => {
    //         //     if (err) {
    //         //       console.log(err);
    //         //     }
    //         //   });
    //         // }
    //       });
    //     }
    //   });
    // })
    .catch((e: any) => {
      console.log(e);
    });
};

export default server;
