import { Router } from "express";
import Flutterwave from "./flutterwave";

const router: Router = Router();

router.use("/flutterwave", Flutterwave);

export default router;
