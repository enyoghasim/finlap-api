import "express-session"; // don't forget to import the original module
import { IUser } from "../../models/user.model";

declare module "express-session" {
  interface SessionData {
    user: {
      _id: Schema.Types.ObjectId;
    };
  }
}
