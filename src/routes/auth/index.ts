import { Router } from "express";
import Register from "./register";
import EmailVerification from "./email-verification";

const router: Router = Router();

router.use("/register", Register);

router.use("/email", EmailVerification);

export default router;
