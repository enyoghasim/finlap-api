import { Schema, model, Document } from "mongoose";

export interface IPendingBvnVerification extends Document {
  bvn: string;
  user: Schema.Types.ObjectId;
  created: Date;
  reference: string;
}

const PendingBvnVerificationSchema = new Schema({
  bvn: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "Users",
  },
  reference: {
    type: String,
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

export default model<IPendingBvnVerification>(
  "PendingBvnVerifications",
  PendingBvnVerificationSchema
);
