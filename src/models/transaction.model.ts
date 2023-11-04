import { Schema, model, Document } from "mongoose";

export interface ITransaction extends Document {
  user: Schema.Types.ObjectId;
  amount: number;
  // type: ;
  reference: string;
  status: string;
  title: string;
  category: string;
  created: Date;
}

const TransactionSchema = new Schema({});

export default model<ITransaction>("Transactions", TransactionSchema);
