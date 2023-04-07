import { NextFunction, Request, Response, Router } from "express";
import RateLimit from "express-rate-limit";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/response";
import { caseInSensitiveRegex, generateRandomToken } from "../../utils/helpers";
import Users, { IUser } from "../../models/user.model";
import { genSalt, hash } from "bcrypt";
import mailer from "../../controllers/mailer";
import { EMAIL_VERIFICATION } from "../../views/emails";

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
  "/reset",
  limiter,
  async (
    req: Request<
      {},
      {},
      {
        email: string;
      }
    >,
    res: Response
  ) => {
    try {
      let { email } = req.body;
      email = email?.toLowerCase();

      if (!email?.trim()) {
        return sendErrorResponse(res, 400, "username/email is required");
      }

      const userTagRegex: RegExp = caseInSensitiveRegex(email);

      const userDetails: IUser | null = await Users.findOne({
        $or: [{ email: userTagRegex }, { userTag: userTagRegex }],
      });

      if (!userDetails) {
        return sendErrorResponse(
          res,
          404,
          "No account found with this username/email"
        );
      }
      //  check if email is verified
      if (userDetails.isEmailVerified) {
        return sendErrorResponse(res, 400, "Email already verified");
      }

      //  check if verification token exists
      await VerificationTokens.deleteMany({
        user: userDetails._id,
      });

      const selector: string = generateRandomToken();
      const token: string = generateRandomToken();
      const salt = await genSalt(10);

      const hashedToken = await hash(token, salt);

      const verificationToken = new VerificationTokens({
        user: userDetails._id,
        type: "verify-email",
        selector,
        token: hashedToken,
        createdAt: new Date(),
        expiresAt: new Date(new Date().getTime() + 15 * 60 * 1000),
      });

      await verificationToken.save();

      //  send email
      mailer.sendTemplatedEmail({
        recipients: [userDetails.email],
        template: EMAIL_VERIFICATION,
        templateData: {
          firstname: userDetails.firstname,
          link: `${process.env.FRONTEND_URL}/reset-password?selector=${selector}&token=${token}`,
        },
      });

      return sendSuccessResponse(res, 200, null, "Verification link resent");
    } catch (err) {
      console.log(err);
      return sendErrorResponse(res, 500, "Internal Server Error");
    }
  }
);

export default router;
