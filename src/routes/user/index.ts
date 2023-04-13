import { NextFunction, Request, Response, Router } from "express";
import Users from "../../models/user.model";
import {
  capitalizeFirstLetter,
  caseInSensitiveRegex,
  generateRandomToken,
  isValidName,
  isValidUsername,
} from "../../utils/helpers";
import isEmail from "validator/lib/isEmail";
import { sendErrorResponse, sendSuccessResponse } from "../../utils/response";
import VerificationTokens from "../../models/verification-token.model";
import { genSalt, hash } from "bcrypt";
import mailer from "../../controllers/mailer";
import { EMAIL_VERIFICATION } from "../../views/emails";

const router: Router = Router();

router.use("/", (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return sendErrorResponse(res, 401, "Unauthorized");
  }

  return next();
});

router.get("/profile", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.user?._id;

    const user = await Users.findOne({
      _id: userId,
    });

    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    return sendSuccessResponse(
      res,
      200,
      {
        user: {
          _id: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          userTag: user.userTag,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          balance: user.balance.toFixed(2),
          qr: user.qr,
          identityVerified: user.isIdentityVerified,
        },
      },
      "User found"
    );
  } catch (e) {
    console.log(e);

    return sendErrorResponse(res);
  }
});

router.put(
  "/profile",
  async (
    req: Request<
      {},
      {},
      {
        firstname?: string;
        lastname?: string;
        email?: string;
        userTag?: string;
      }
    >,
    res: Response
  ) => {
    try {
      let updateFields: {
        firstname?: string;
        lastname?: string;
        email?: string;
        userTag?: string;
        isEmailVerified?: boolean;
      } = {};

      const _id = req.session?.user?._id;

      const user = await Users.findOne({
        _id,
      });

      if (!user) {
        return sendErrorResponse(res, 404, "User not found");
      }

      let { firstname, lastname, email, userTag } = req.body;
      email = email?.toLowerCase();
      firstname = capitalizeFirstLetter(firstname ?? "");
      lastname = capitalizeFirstLetter(lastname ?? "");

      if (firstname) {
        if (user.isIdentityVerified) {
          return sendErrorResponse(
            res,
            400,
            "Firstname cannot be changed please contact support"
          );
        }
        if (!isValidName(firstname)) {
          return sendErrorResponse(res, 400, "Invalid firstname");
        } else {
          updateFields.firstname = firstname;
        }
      }

      if (lastname) {
        if (user.isIdentityVerified) {
          return sendErrorResponse(
            res,
            400,
            "Lastname cannot be changed please contact support"
          );
        }
        if (!isValidName(lastname)) {
          return sendErrorResponse(res, 400, "Invalid lastname");
        } else {
          updateFields.lastname = lastname;
        }
      }

      if (email) {
        if (!isEmail(email)) {
          return sendErrorResponse(res, 400, "Invalid email address");
        } else {
          updateFields.email = email;
          updateFields.isEmailVerified = false;
        }
      }

      if (userTag) {
        if (!isValidUsername(userTag)) {
          return sendErrorResponse(
            res,
            400,
            "Username can only contain letters, numbers, underscores and periods"
          );
        } else {
          updateFields.userTag = userTag;
        }
      }

      if (updateFields.email || updateFields.userTag) {
        const usernameRegex: RegExp = caseInSensitiveRegex(
          updateFields.userTag ?? ""
        );

        const userWithEmailOrUsername = await Users.findOne({
          $or: [
            {
              email: updateFields.email ?? "",
            },
            {
              userTag: usernameRegex,
            },
          ],
        });

        if (userWithEmailOrUsername) {
          if (updateFields.email) {
            if (updateFields.email === userWithEmailOrUsername.email) {
              return sendErrorResponse(
                res,
                400,
                "Email address already in use"
              );
            }
          }

          if (updateFields.userTag) {
            if (
              updateFields.userTag.toLowerCase() ===
              userWithEmailOrUsername.userTag.toLowerCase()
            ) {
              return sendErrorResponse(res, 400, "Username already in use");
            }
          }
        }
      }

      if (Object.keys(updateFields).length === 0) {
        return sendErrorResponse(res, 400, "No fields to update");
      }

      const updatedUser = await Users.findOneAndUpdate(
        {
          _id,
        },
        {
          $set: updateFields,
        },
        {
          new: true,
        }
      );

      if (!updatedUser) {
        return sendErrorResponse(res, 500, "Unable to update user");
      }

      if (updateFields.email) {
        // send email verification link
        await VerificationTokens.deleteMany({
          user: updatedUser._id,
        });

        const selector: string = generateRandomToken();
        const token: string = generateRandomToken();
        const salt = await genSalt(10);

        const hashedToken = await hash(token, salt);

        const verificationToken = new VerificationTokens({
          user: updatedUser._id,
          type: "verify-email",
          selector,
          token: hashedToken,
          createdAt: new Date(),
          expiresAt: new Date(new Date().getTime() + 15 * 60 * 1000),
        });

        //  send email
        mailer.sendTemplatedEmail({
          recipients: [updatedUser.email],
          template: EMAIL_VERIFICATION,
          templateData: {
            firstname: updatedUser.firstname,
            link: `${process.env.FRONTEND_URL}/verify-email?selector=${selector}&token=${token}`,
          },
        });

        await verificationToken.save();
      }

      return sendSuccessResponse(
        res,
        200,
        {
          _id: updatedUser._id,
          firstname: updatedUser.firstname,
          lastname: updatedUser.lastname,
          userTag: updatedUser.userTag,
          email: updatedUser.email,
          isEmailVerified: updatedUser.isEmailVerified,
          balance: updatedUser.balance.toFixed(2),
          qr: updatedUser.qr,
          identityVerified: updatedUser.isIdentityVerified,
        },
        `User updated successfully${
          updateFields?.email
            ? " please check your email for verification link"
            : ""
        }`
      );
    } catch (e) {
      console.log(e);

      return sendErrorResponse(res);
    }
  }
);

router.post(
  "/verify-account",
  async (
    req: Request<
      {},
      {},
      {
        bvn: string;
      }
    >,
    res: Response
  ) => {
    try {
      const _id = req.session?.user?._id;

      const { bvn } = req.body;

      if (!bvn) {
        return sendErrorResponse(res, 400, "BVN is required");
      }
    } catch (e) {
      console.log(e);

      return sendErrorResponse(res);
    }
  }
);

export default router;
