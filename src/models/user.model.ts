import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  firstname: string;
  lastname: string;
  userTag: string;
  email: string;
  isEmailVerified: boolean;
  isIdentityVerified: boolean;
  identityVerificationStatus: string;
  password: string;
  balance: number;
  bvn: string;
  accountDetails: {
    number: string;
    bankName: string;
    flwRef: string;
    orderRef: string;
    createdAt: Date;
  };
  // nin: string;
  referrer: Schema.Types.ObjectId;
  referrals: Schema.Types.ObjectId[];
  beneficialBankAccounts: Array<{
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
  }>;
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
  identityVerificationStatus: {
    type: String,
    default: "not-submited",
    enum: ["not-submited", "pending", "approved", "rejected"],
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  bvn: {
    type: String,
    select: false,
  },
  accountDetails: {
    type: Object,
    default: null,
  },
  // nin: {
  //   type: String,
  //   select: false,
  // },
  referrer: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    default: null,
  },
  referrals: {
    type: [Schema.Types.ObjectId],
    ref: "Users",
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

export default model<IUser>("Users", UserSchema);
