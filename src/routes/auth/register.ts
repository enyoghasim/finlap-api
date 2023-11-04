import { Router, Request, Response } from "express";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/response";
import { genSalt, hash } from "bcrypt";
import {
  capitalizeFirstLetter,
  caseInSensitiveRegex,
  generateRandomToken,
  isValidName,
  isValidUsername,
} from "../../utils/helpers";
import isEmail from "validator/lib/isEmail";
import Users, { IUser } from "../../models/user.model";
import VerificationTokens from "../../models/verification-token.model";
import Mailer from "../../controllers/mailer";
import { WELCOME_VERIFICATION } from "../../views/emails";

const router: Router = Router();
const mailer = new Mailer();

router.post(
  "/",
  async (
    req: Request<
      {},
      {},
      {
        firstname: string;
        lastname: string;
        email: string;
        password: string;
        userTag: string;
        referrer?: string;
      }
    >,
    res: Response
  ) => {
    try {
      let { firstname, lastname, email, password, userTag } = req.body;
      email = email?.toLowerCase();
      firstname = capitalizeFirstLetter(firstname ?? "");
      lastname = capitalizeFirstLetter(lastname ?? "");

      if (
        !firstname?.trim() ||
        !lastname?.trim() ||
        !email?.trim() ||
        !password?.trim() ||
        !userTag?.trim()
      ) {
        return sendErrorResponse(res, 400, "All fields are required");
      }

      if (!isValidName(firstname) || !isValidName(lastname)) {
        return sendErrorResponse(res, 400, "Invalid firstname or lastname");
      }

      if (!isEmail(email)) {
        return sendErrorResponse(res, 400, "Invalid email address");
      }

      if (!isValidUsername(userTag)) {
        return sendErrorResponse(
          res,
          400,
          "Username can only contain letters, numbers, underscores and periods"
        );
      }

      if (password.length < 6) {
        return sendErrorResponse(
          res,
          400,
          "Password must be at least 6 characters"
        );
      }

      const userTagRegex: RegExp = caseInSensitiveRegex(userTag);

      const userDetails: IUser | null = await Users.findOne({
        $or: [{ email }, { userTag: { $regex: userTagRegex } }],
      });

      if (userDetails) {
        if (userDetails.email === email) {
          return sendErrorResponse(
            res,
            400,
            "Email already used by another user"
          );
        }

        if (userDetails.userTag.toLowerCase() === userTag.toLowerCase()) {
          return sendErrorResponse(
            res,
            400,
            "userTag already used by another user"
          );
        }
      }

      const salt = await genSalt(10);
      const hashedPassword = await hash(password, salt);

      const newUser = new Users({
        firstname,
        lastname,
        email,
        userTag,
        password: hashedPassword,
      });

      const selector: string = generateRandomToken();
      const token: string = generateRandomToken();

      const hashedToken = await hash(token, salt);

      const newVerificationToken = new VerificationTokens({
        user: newUser._id,
        type: "verify-email",
        token: hashedToken,
        selector,
        createdAt: new Date(),
        expiresAt: new Date(new Date().getTime() + 15 * 60 * 1000),
      });

      await newVerificationToken.save();

      mailer.sendTemplatedEmail({
        recipients: [email],
        template: WELCOME_VERIFICATION,
        templateData: {
          firstname,
          link: `${process.env.FRONTEND_URL}/verify-email?selector=${selector}&token=${token}`,
        },
      });

      if (req.body.referrer) {
        const referrerRegex = caseInSensitiveRegex(req.body.referrer);
        const referrerDetails: IUser | null = await Users.findOne({
          userTag: { $regex: referrerRegex },
        });

        if (referrerDetails) {
          newUser.referrer = referrerDetails._id;
          referrerDetails.referrals.push(newUser._id);
          await referrerDetails.save();
        }
      }

      await newUser.save();

      sendSuccessResponse(res, 201, null, "User created successfully");
    } catch (err) {
      console.error(err);
      return sendErrorResponse(res, 500, "Something went wrong");
    }
  }
);

export default router;
