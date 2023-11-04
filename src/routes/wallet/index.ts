import { NextFunction, Request, Response, Router } from "express";
import { sendErrorResponse } from "../../utils/response";

import Transfer from "./transfer";

const router: Router = Router();

router.use("/", (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return sendErrorResponse(res, 401, "Unauthorized");
  }

  return next();
});

router.use("/transfer", Transfer);

export default router;
