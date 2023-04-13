import { NextFunction, Request, Response, Router } from "express";
import Users from "../../models/user.model";

const router: Router = Router();

router.use("/", (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    res.status(401).json({
      message: "Unauthorized",
    });
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
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User found",
      data: {
        user: {
          _id: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          balance: user.balance.toFixed(2),
          qr: user.qr,
        },
      },
    });
  } catch (e) {
    console.log(e);

    return res.status(500).json({
      message: "Internal Server Error",
      status: "error",
    });
  }
});

export default router;
