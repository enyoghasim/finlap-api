import { Router } from "express";
import Register from "./register";
import Login from "./login";
import EmailVerification from "./email-verification";
import Password from "./password";

const router: Router = Router();

router.use("/register", Register);

router.use("/login", Login);

router.use("/email", EmailVerification);

router.use("/password", Password);

export default router;
