import { Request, Response } from "express";
import { ILogoutDto } from "./user.dto";
import {
  createLoginCredentials,
  createRevokeToken,
  logoutEnum,
} from "../../utils/security/token.security";
import { UpdateQuery } from "mongoose";
import { HUserDocument, IUser, UserModel } from "../../DB/models/user.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { JwtPayload } from "jsonwebtoken";

class UserService {
  private userModel = new UserRepository(UserModel);

  constructor() {}

  profile = async (req: Request, res: Response): Promise<Response> => {
    return res.json({
      message: "done",
      data: {
        user: req.user,
        decoded: req.decoded,
      },
    });
  };


  logout = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: ILogoutDto = req.body;

    const update: UpdateQuery<IUser> = {};

    switch (flag) {
      case logoutEnum.all:
        update.changeCredentialsTime = new Date();
        break;

      default:
        await createRevokeToken(req.decoded as JwtPayload)
        break;
    }

    await this.userModel.updateOne({
      filter: { _id: req.decoded?._id },
      update,
    });

    return res.json({
      message: "logged out successfully",
    });
  };


  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const credentials = await createLoginCredentials(req.user as HUserDocument);
    await createRevokeToken(req.decoded as JwtPayload)
    return res.status(201).json({ message: "Done", data: { credentials } });
  };
}

export default new UserService();
