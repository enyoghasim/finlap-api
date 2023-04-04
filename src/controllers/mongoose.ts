import { connect, ConnectOptions, connection } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

class Mongoose {
  constructor() {}
  connect() {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    return new Promise((resolve, reject): void => {
      connect(process.env.MONGODB_URI as string, options as ConnectOptions)
        .then((e: any) => {
          return resolve("[Database] Connected to database");
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

export { connection };

export default Mongoose;
