import { Router, Request, Response } from "express";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/response";
import { caseInSensitiveRegex } from "../../utils/helpers";
import Users, { IUser } from "../../models/user.model";
import { compare } from "bcrypt";

const router: Router = Router();

router.use(
  "/login",
  async (
    req: Request<
      {},
      {},
      {
        email: string;
        password: string;
      }
    >,
    res: Response
  ) => {
    try {
      let { email, password } = req.body;
      email = email?.toLowerCase();

      if (!email?.trim() || !password?.trim()) {
        return sendErrorResponse(res, 400, "All fields are required");
      }

      const userTagRegex = caseInSensitiveRegex(email);

      const userDetails: IUser | null = await Users.findOne({
        $or: [{ email: userTagRegex }, { userTag: userTagRegex }],
      });

      if (!userDetails) {
        return sendErrorResponse(res, 400, "Invalid email or password");
      }

      const isPasswordValid = await compare(password, userDetails.password);
      if (!isPasswordValid) {
        return sendErrorResponse(res, 400, "Invalid email or password");
      }

      req.session.user = {
        _id: userDetails._id,
      };

      return sendSuccessResponse(res, 200, null, "Login successful");
    } catch (err) {
      console.log(err);
      return sendErrorResponse(res, 500, "Internal Server Error");
    }
  }
);

export default router;
