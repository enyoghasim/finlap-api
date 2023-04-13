import { Router } from "express";
import Auth from "./auth";
import User from "./user";

const router: Router = Router();

router.use("/auth", Auth);

router.use("/user", User);

export default router;
