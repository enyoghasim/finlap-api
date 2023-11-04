import { NextFunction, Request, Response, Router } from "express";
import Users, { IUser } from "../../models/user.model";
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
import Mailer from "../../controllers/mailer";
import { EMAIL_VERIFICATION } from "../../views/emails";
import Flutterwave from "../../service/flutterwave";
import PendingBvnVerifications from "../../models/pending-bvn-verifications";

const router: Router = Router();
const mailer = new Mailer();

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

      if (!bvn?.trim()) {
        return sendErrorResponse(res, 400, "BVN is required");
      }

      if (bvn.length !== 11 || !/^\d+$/.test(bvn)) {
        return sendErrorResponse(res, 400, "Invalid BVN");
      }

      const userDetails: IUser | null = await Users.findOne({
        _id,
      });

      if (!userDetails) {
        return sendErrorResponse(res, 404, "User not found");
      }

      if (userDetails.isIdentityVerified) {
        return sendErrorResponse(res, 400, "Account already verified");
      }

      if (userDetails.isEmailVerified === false) {
        return sendErrorResponse(
          res,
          400,
          "Please verify your email address first"
        );
      }

      if (userDetails.identityVerificationStatus === "pending") {
        return sendErrorResponse(
          res,
          400,
          "Verification is already in progress"
        );
      }

      const userWithBVN: IUser | null = await Users.findOne({
        bvn,
      });

      if (userWithBVN && userWithBVN._id.toString() !== _id.toString()) {
        return sendErrorResponse(
          res,
          400,
          "BVN already in use by another user"
        );
      }

      const flutterwave = new Flutterwave();

      const bvnDetails = await flutterwave.initiateBVNConsent({
        bvn,
        firstname: userDetails.firstname,
        lastname: userDetails.lastname,
        redirectUrl: `${process.env.FRONTEND_URL}`,
      });

      if (bvnDetails.status === "success") {
        // check if there is a pending verification for this user
        const pendingVerification = await PendingBvnVerifications.findOne({
          user: _id,
        });

        if (pendingVerification) {
          pendingVerification.bvn = bvn;
          pendingVerification.reference = bvnDetails.data?.reference ?? "";
          pendingVerification.created = new Date();
          await pendingVerification.save();
        } else {
          const newPendingVerification = new PendingBvnVerifications({
            user: _id,
            bvn,
            reference: bvnDetails.data?.reference ?? "",
            created: new Date(),
          });

          await newPendingVerification.save();
        }

        return sendSuccessResponse(
          res,
          200,
          {
            consentUrl: bvnDetails.data?.url,
          },
          "BVN verification initiated"
        );
      } else {
        return sendErrorResponse(
          res,
          400,
          bvnDetails.message ?? "unable to initiate BVN verification"
        );
      }
    } catch (e) {
      console.log(e);

      return sendErrorResponse(res);
    }
  }
);

export default router;
