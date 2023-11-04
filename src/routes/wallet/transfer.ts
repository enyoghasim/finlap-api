import { Request, Response, Router } from "express";

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  // check request body fill all fields needed like (tag/email to send to or bank account) is avaialble
  //if tag is available, check if tag is valid
  //   if account number is available validate it
  //   check the user's balance
  //   transfer
  // get amount to send
});

export default router;
