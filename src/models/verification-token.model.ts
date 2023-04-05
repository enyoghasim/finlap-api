import { Schema, model, Document } from "mongoose";

export interface IVerificationToken extends Document {
  user: Schema.Types.ObjectId;
  type: string;
  token: string;
  selector: string;
  createdAt: Date;
  expiresAt: Date;
}

const verificationTokenSchema = new Schema<IVerificationToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    token: {
      type: String,
      required: true,
    },
    selector: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      default: "verify-email",
      enum: ["verify-email", "reset-password"],
    },
  },
  { timestamps: true }
);

export default model<IVerificationToken>(
  "verificationToken",
  verificationTokenSchema
);
