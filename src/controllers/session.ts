import MongoStore from "connect-mongo";

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI!,
  collectionName: "sessions",
});

export default sessionStore;
