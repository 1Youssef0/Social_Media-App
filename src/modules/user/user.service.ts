import { Request, Response } from "express";
import { IFreezeAccountDto, IHardDeleteAccountDto, ILogoutDto, IRestoreAccountDto } from "./user.dto";
import {
  createLoginCredentials,
  createRevokeToken,
  logoutEnum,
} from "../../utils/security/token.security";
import { Types, UpdateQuery } from "mongoose";
import {
  HUserDocument,
  IUser,
  roleEnum,
  UserModel,
} from "../../DB/models/user.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { JwtPayload } from "jsonwebtoken";
import {
  createPreSignedUpLoadLink,
  deleteFiles,
  deleteFolderByPrefix,
  uploadFile,
  uploadFiles,
  uploadLargeFile,
} from "../../utils/multer/s3.config";
import { storageEnum } from "../../utils/multer/cloud.multer";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.events";
import { success } from "zod";
import { successResponse } from "../../utils/response/success.response";
import { ICoverImageResponse, IProfileImageResponse } from "./user.entites";

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

  profileImage = async (req: Request, res: Response): Promise<Response> => {
    const key = await uploadLargeFile({
      file: req.file as Express.Multer.File,
      path: `users/${req.decoded?._id}`,
      storageApproach: storageEnum.disk,
    });
    return res.json({
      message: "done",
      data: {
        key,
      },
    });
  };

  preSignedUpUrl = async (req: Request, res: Response): Promise<Response> => {
    const {
      ContentType,
      originalname,
    }: { ContentType: string; originalname: string } = req.body;
    const { url, Key } = await createPreSignedUpLoadLink({
      ContentType,
      originalname,
      path: `users/${req.decoded?._id}`,
    });

    const user = await this.userModel.findByIdAndUpdate({
      id: req?.user?._id as Types.ObjectId,
      update: {
        profileImage: Key,
        temProfileImage: req.user?.profileImage,
      },
    });

    if (!user) {
      throw new BadRequestException("failed to update user profile-image");
    }

    s3Event.emit("trackProfileImageUpload", {
      userId: req.user?._id,
      oldKey: req.user?.profileImage,
      Key,
      expiresIn: 30000,
    });

    return successResponse<IProfileImageResponse>({res , data: {url}})
  };

  profileCoverImage = async (req: Request, res: Response): Promise<Response> => {
    const urls = await uploadFiles({
      files: req.files as Express.Multer.File[],
      path: `users/${req.decoded?._id}/cover`,
      storageApproach: storageEnum.disk,
    });

    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        coverImages: urls,
      },
    });

    if (!user) {
      throw new BadRequestException("failed to update profile cover images");
    }

    if (req.user?.coverImages) {
      await deleteFiles({ urls: req.user.coverImages });
    }

    return successResponse<ICoverImageResponse>({res,data:{user}})
  };

  logout = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: ILogoutDto = req.body;

    const update: UpdateQuery<IUser> = {};

    switch (flag) {
      case logoutEnum.all:
        update.changeCredentialsTime = new Date();
        break;

      default:
        await createRevokeToken(req.decoded as JwtPayload);
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
    await createRevokeToken(req.decoded as JwtPayload);
    return res.status(201).json({ message: "Done", data: { credentials } });
  };

  freezeAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = (req.params as IFreezeAccountDto) || {};
    if (userId && req.user?.role !== roleEnum.admin) {
      throw new ForbiddenException("not authorized account");
    }

    const user = await this.userModel.updateOne({
      filter: {
        _id:userId || req.user?._id,
        freezedAt: { $exists: true },
      },
      update: {
        freezedAt: new Date(),
        freezedBy: req.user?._id,
        changeCredentialsTime: new Date(),
        $unset: {
          restoredAt: 1,
          restoredBy: 1,
        },
      },
    });

    if (!user.matchedCount) {
      throw new NotFoundException("user not found or fail to delete this user");
    }

    return res.json({ message: "done" });
  };

  restoreAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as IRestoreAccountDto;
 

    const user = await this.userModel.updateOne({
      filter: {
        _id: userId,
        freezedAt: { $ne: userId },
      },
      update: {
        restoredAt: new Date(),
        restoredBy: req.user?._id,
        $unset: {
         freezedAt: 1,
         freezedBy: 1,
        },
      },
    });

    if (!user.matchedCount) {
      throw new NotFoundException("user not found or fail to restore this user");
    }

    return res.json({ message: "done" });
  };

  hardDeleteAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as IHardDeleteAccountDto;
 

    const user = await this.userModel.deleteOne({
      filter: {
        _id: userId,
        freezedAt: { $exists: true },
      }
    });
 
    if (!user.deletedCount) {
      throw new NotFoundException("user not found or hard delete this account");
    }

    await deleteFolderByPrefix({
      path:`users/${userId}`
    })

    return res.json({ message: "done" });
  };


}

export default new UserService();
