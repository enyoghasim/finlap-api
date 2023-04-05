import { Router, Request, Response, NextFunction } from "express";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/response";
import RateLimit from "express-rate-limit";
import isHexadecimal from "validator/lib/isHexadecimal";
import VerificationTokens from "../../models/verification-token.model";
import Users from "../../models/user.model";
import { compare } from "bcrypt";

const router: Router = Router();

const rateLimitHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(429).json({
    status: "error",
    message: "Too many requests, please try again later",
    retryAfter: 15 * 60, // retry after 15 minutes
  });
};

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later",
  handler: rateLimitHandler,
});

router.post(
  "/verify/:selector/:token",
  limiter,
  async (
    req: Request<{ selector: string; token: string }, {}, {}>,
    res: Response
  ) => {
    try {
      const { selector, token } = req.params;

      if (!selector || !token) {
        return sendErrorResponse(res, 400, "Invalid verification link");
      }

      if (!isHexadecimal(selector) || !isHexadecimal(token)) {
        return sendErrorResponse(res, 400, "Invalid verification link");
      }

      const verificationToken = await VerificationTokens.findOne({
        selector,
        type: "verify-email",
      });

      if (!verificationToken) {
        return sendErrorResponse(res, 400, "Invalid verification link");
      }

      if (verificationToken.expiresAt.getTime() < new Date().getTime()) {
        await verificationToken.deleteOne({
          _id: verificationToken._id,
        });

        return sendErrorResponse(res, 400, "Verification link has expired");
      }

      const isValid = await compare(token, verificationToken.token);

      if (!isValid) {
        return sendErrorResponse(res, 400, "Invalid verification link");
      }

      const user = await Users.findOne({
        _id: verificationToken.user,
      });

      if (!user) {
        return sendErrorResponse(res, 404, "Invalid verification link");
      }

      if (user.isEmailVerified) {
        await verificationToken.deleteOne({
          _id: verificationToken._id,
        });
        return sendErrorResponse(res, 400, "Email already verified");
      }

      user.isEmailVerified = true;
      await user.save();

      await verificationToken.deleteOne({
        _id: verificationToken._id,
      });

      return sendSuccessResponse(res, 200, null, "Email verified successfully");

      //   find the user with the verification token
    } catch (error: any) {
      return sendErrorResponse(
        res,
        500,
        error.message ?? "Internal Server Error"
      );
    }
  }
);

export default router;
