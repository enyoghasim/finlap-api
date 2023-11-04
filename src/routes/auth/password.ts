import { NextFunction, Request, Response, Router } from "express";
import RateLimit from "express-rate-limit";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/response";
import { caseInSensitiveRegex, generateRandomToken } from "../../utils/helpers";
import Users, { IUser } from "../../models/user.model";
import VerificationTokens from "../../models/verification-token.model";
import { compare, genSalt, hash } from "bcrypt";
import Mailer from "../../controllers/mailer";
import { RESET_PASSWORD_REQUEST } from "../../views/emails";
import isHexadecimal from "validator/lib/isHexadecimal";
import sessionStore from "../../controllers/session";

const router: Router = Router();
const mailer = new Mailer();

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
        type: "reset-password",
        selector,
        token: hashedToken,
        createdAt: new Date(),
        expiresAt: new Date(new Date().getTime() + 15 * 60 * 1000),
      });

      await verificationToken.save();

      //  send email
      mailer.sendTemplatedEmail({
        recipients: [userDetails.email],
        template: RESET_PASSWORD_REQUEST,
        templateData: {
          firstname: userDetails.firstname,
          link: `${process.env.FRONTEND_URL}/reset-password?selector=${selector}&token=${token}`,
        },
      });

      return sendSuccessResponse(res, 200, null, "Password reset link resent");
    } catch (err) {
      console.log(err);
      return sendErrorResponse(res, 500, "Internal Server Error");
    }
  }
);

router.post(
  "/reset/:selector/:token",
  limiter,
  async (
    req: Request<{ selector: string; token: string }, {}, { password: string }>,
    res: Response
  ) => {
    try {
      const { selector, token } = req.params;

      if (!selector || !token) {
        return sendErrorResponse(res, 400, "Invalid password reset link");
      }

      if (!isHexadecimal(selector) || !isHexadecimal(token)) {
        return sendErrorResponse(res, 400, "Invalid password reset link");
      }

      const verificationToken = await VerificationTokens.findOne({
        selector,
        type: "reset-password",
      });

      if (!verificationToken) {
        return sendErrorResponse(res, 400, "Invalid password reset link");
      }

      if (verificationToken.expiresAt.getTime() < new Date().getTime()) {
        await VerificationTokens.deleteMany({
          _id: verificationToken._id,
        });

        return sendErrorResponse(res, 400, "Password reset link has expired");
      }

      const isValid = await compare(token, verificationToken.token);

      if (!isValid) {
        return sendErrorResponse(res, 400, "Invalid password reset link");
      }

      const user = await Users.findOne({
        _id: verificationToken.user,
      });

      if (!user) {
        return sendErrorResponse(res, 404, "Invalid password reset link");
      }

      if (!req.body.password) {
        return sendErrorResponse(res, 400, "Password is required");
      }

      if (req.body.password.length < 6) {
        return sendErrorResponse(
          res,
          400,
          "Password must be at least 6 characters long"
        );
      }

      const salt = await genSalt(10);

      user.password = await hash(req.body.password, salt);

      await user.save();

      await VerificationTokens.deleteMany({
        _id: verificationToken._id,
      });

      sendSuccessResponse(res, 200, null, "Password changed successfully");
      //return sessionStore.all((err, sessions) => {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     if (!sessions || !sessions.length || !Array.isArray(sessions)) {
      //       return;
      //     }
      //     sessions.forEach((session) => {
      //       if (session.user === user._id.toString()) {
      //         sessionStore.destroy(session.sessionId, (err) => {
      //           if (err) {
      //             console.log(err);
      //           }
      //         });
      //       }
      //     });
      //   }
      // });

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

router.post(
  "/update",
  limiter,
  async (
    req: Request<
      {},
      {},
      {
        password: string;
        newPassword: string;
      }
    >,
    res: Response
  ) => {
    try {
      const _id = req.session?.user?._id;
      const { password, newPassword } = req.body;

      if (!password || !newPassword) {
        return sendErrorResponse(res, 400, "All fields are required");
      }

      if (password.length < 6 || newPassword.length < 6) {
        return sendErrorResponse(
          res,
          400,
          "Password must be at least 6 characters long"
        );
      }

      const userDetails = await Users.findOne({
        _id,
      });

      if (!userDetails) {
        return sendErrorResponse(res, 404, "User not found");
      }

      const isValid = await compare(password, userDetails.password);

      if (!isValid) {
        return sendErrorResponse(res, 400, "Invalid password");
      }

      const salt = await genSalt(10);
      const hashedPassword = await hash(newPassword, salt);

      const updatedUser = await Users.updateOne(
        {
          _id,
        },
        {
          $set: {
            password: hashedPassword,
          },
        }
      );

      if (!updatedUser) {
        return sendErrorResponse(res);
      }

      return sendSuccessResponse(res, 200, null, "Password updated");
    } catch (err) {
      console.log(err);
      return sendErrorResponse(res);
    }
  }
);

export default router;
