import { Request } from "express";
import { Schema } from "mongoose";
import { IUser } from "../../models/user.model";

declare global {
  namespace Express {
    export interface Request {
      session: {
        user: {
          _id: Schema.Types.ObjectId;
        };
      };
    }
  }
}
