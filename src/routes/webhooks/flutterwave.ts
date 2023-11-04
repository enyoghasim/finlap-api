import { config } from "dotenv";
import { NextFunction, Request, Response, Router } from "express";
import Users from "../../models/user.model";
import PendingBvnVerifications from "../../models/pending-bvn-verifications";
import Mailer from "../../controllers/mailer";
import Flutterwave from "../../service/flutterwave";
import {
  BVN_VERIFICATION_FAILED,
  BVN_VERIFICATION_SUCCESSFUL,
} from "../../views/emails";

const router: Router = Router();
const mailer = new Mailer();
const flutterwave = new Flutterwave();
config();

router.use("/", async (req: Request, res: Response, next: NextFunction) => {
  const SECRET_HASH: string = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH!;
  const SIGNATURE = req.headers["verif-hash"];

  if (!SIGNATURE || (SIGNATURE as string) !== SECRET_HASH) {
    res.status(401).end();
  }

  return next();
});

router.post("/", async (req: Request, res: Response) => {
  const { payload } = req.body;

  if (!payload || !payload.event) return res.status(400).end();

  switch (payload.event) {
    case "bvn.completed":
      const { data } = payload;

      try {
        if (!data) return res.status(400).end();

        if (data.status === "COMPLETED") {
          const pendingBvnVerification = await PendingBvnVerifications.findOne({
            reference: data?.reference,
          });

          if (!pendingBvnVerification) return res.status(400).end();

          const userWithDetails = await Users.findOne({
            $or: [
              { _id: pendingBvnVerification.user },
              { bvn: pendingBvnVerification.bvn },
            ],
          });

          if (!userWithDetails) return res.status(400).end();

          if (
            userWithDetails._id.toString() !==
              pendingBvnVerification.user.toString() ||
            userWithDetails.isIdentityVerified
          )
            return res.status(200).end();

          if (
            userWithDetails.firstname.toLowerCase() !==
              data.firstname.toLowerCase() ||
            userWithDetails.lastname.toLowerCase() !==
              data.lastname.toLowerCase()
          ) {
            res.status(200).end();
            userWithDetails.identityVerificationStatus = "rejected";
            await userWithDetails.save();

            PendingBvnVerifications.deleteOne({
              _id: pendingBvnVerification._id,
            });

            mailer.sendTemplatedEmail({
              recipients: [userWithDetails.email],
              template: BVN_VERIFICATION_FAILED,
              templateData: {
                firstname: userWithDetails.firstname,
                reason: "names mismatch",
              },
            });
            return;
          } else {
            res.status(200).end();

            userWithDetails.identityVerificationStatus = "verified";
            userWithDetails.bvn = pendingBvnVerification.bvn;

            // generate account number for user
            const { data: accountData, status } =
              await flutterwave.createVirtualAccountNumber({
                isPermanent: true,
                email: userWithDetails.email,
                bvn: pendingBvnVerification.bvn,
              });

            if (status === "success" && accountData) {
              userWithDetails.accountDetails = {
                number: accountData!.account_number,
                bankName: accountData!.bank_name,
                flwRef: accountData!.flw_ref,
                orderRef: accountData!.order_ref,
                createdAt: new Date(accountData!.created_at),
              };
            }

            await userWithDetails.save();

            PendingBvnVerifications.deleteOne({
              _id: pendingBvnVerification._id,
            });

            mailer.sendTemplatedEmail({
              recipients: [userWithDetails.email],
              template: BVN_VERIFICATION_SUCCESSFUL,
              templateData: {
                firstname: userWithDetails.firstname,
              },
            });
            return;
          }
        } else {
          const pendingBvnVerification = await PendingBvnVerifications.findOne({
            reference: data?.reference,
          });

          if (!pendingBvnVerification) return res.status(400).end();

          const userWithDetails = await Users.findOne({
            _id: pendingBvnVerification.user,
          });

          if (!userWithDetails) return res.status(400).end();

          res.status(200).end();

          userWithDetails.identityVerificationStatus = "rejected";
          await userWithDetails.save();

          PendingBvnVerifications.deleteOne({
            _id: pendingBvnVerification._id,
          });

          mailer.sendTemplatedEmail({
            recipients: [userWithDetails.email],
            template: BVN_VERIFICATION_FAILED,
            templateData: {
              firstname: userWithDetails.firstname,
              reason: "bvn verification failed",
            },
          });
          return;
        }
      } catch (error) {
        console.log("flutterwave webhook bvn error", error);
        return res.status(400).end();
      }

    default:
      return res.status(400).end();
  }
});
export default router;
