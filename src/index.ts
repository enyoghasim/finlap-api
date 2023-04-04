import server from "./server";
import dotenv from "dotenv";

/* dotenv is used to load environment variables from a .env file */
(() => {
  try {
    dotenv.config();

    // Provision server
    server();
  } catch (error) {
    process.exit(1);
  }
})();
