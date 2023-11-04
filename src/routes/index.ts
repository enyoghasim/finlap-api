import { Router } from "express";
import Auth from "./auth";
import User from "./user";
import Webhooks from "./webhooks";
import Wallet from "./wallet";

const router: Router = Router();

router.use("/auth", Auth);

router.use("/user", User);

router.use("/webhooks", Webhooks);

router.use("/wallet", Wallet);

export default router;
