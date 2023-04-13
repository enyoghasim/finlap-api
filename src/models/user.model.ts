import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  firstname: string;
  lastname: string;
  userTag: string;
  email: string;
  isEmailVerified: boolean;
  isIdentityVerified: boolean;
  password: string;
  balance: number;
  bvn: string;
  nin: string;
  referrer: Schema.Types.ObjectId;
  referrals: Schema.Types.ObjectId[];
  beneficialBankAccounts: Array<{
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
  }>;
  qr: {
    url: string;
    type: string;
  };
  created: Date;
}

const UserSchema = new Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  userTag: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isIdentityVerified: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  bvn: {
    type: String,
  },
  nin: {
    type: String,
  },
  referrer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  referrals: {
    type: [Schema.Types.ObjectId],
    ref: "User",
  },
  qr: {
    type: new Schema({
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
      },
    }),
  },
  beneficialBankAccounts: {
    type: Array<{
      accountName: string;
      accountNumber: string;
      bankName: string;
      bankCode: string;
    }>,
    default: [],
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

export default model<IUser>("User", UserSchema);
