import { Request, Response } from "express";
import {
  IFreezeAccountDto,
  IHardDeleteAccountDto,
  ILogoutDto,
  IRestoreAccountDto,
} from "./user.dto";
import {
  createLoginCredentials,
  createRevokeToken,
  logoutEnum,
} from "../../utils/security/token.security";
import { Types, UpdateQuery } from "mongoose";
import {
  genderEnum,
  HUserDocument,
  roleEnum,
  UserModel,
} from "../../DB/models/user.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { JwtPayload } from "jsonwebtoken";
import {
  createPreSignedUpLoadLink,
  deleteFiles,
  deleteFolderByPrefix,
  uploadFiles,
  uploadLargeFile,
} from "../../utils/multer/s3.config";
import { storageEnum } from "../../utils/multer/cloud.multer";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.events";
import { successResponse } from "../../utils/response/success.response";
import { ICoverImageResponse, IProfileImageResponse } from "./user.entites";
import { PostRepository } from "../../DB/repository/post.repository";
import { PostModel } from "../../DB/models/post.model";
import { FriendRequestRepository } from "../../DB/repository/friendRequest.repository";
import { FriendRequestModel } from "../../DB/models/frinedRequest.mode";
import { GraphQLError } from "graphql";

export interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  gender: genderEnum;
  followers: number[];
}

let users: IUser[] = [];

export class UserService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  private friendRequestModel = new FriendRequestRepository(FriendRequestModel);

  constructor() {}

  profile = async (req: Request, res: Response): Promise<Response> => {
    const profile = await this.userModel.findById({
      id: req.user?._id as Types.ObjectId,
      options: {
        populate: [
          {
            path: "friends",
            select: "firstName lastName email gender profilePicture",
          },
        ],
      },
    });

    if (!profile) {
      throw new NotFoundException("fail to find user profile");
    }

    return successResponse({
      res,
      data: { user: profile },
    });
  };

  dashboard = async (req: Request, res: Response): Promise<Response> => {
    const results = await Promise.allSettled([
      this.userModel.find({ filter: {} }),
      this.postModel.find({ filter: {} }),
    ]);

    return successResponse({
      res,
      data: { results },
    });
  };

  changeRole = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };
    const { role }: { role: roleEnum } = req.body;
    const denyRoles: roleEnum[] = [role, roleEnum.superAdmin];
    if (req.user?.role === roleEnum.admin) {
      denyRoles.push(roleEnum.admin);
    }
    const user = await this.userModel.findOneAndUpdate({
      filter: {
        _id: userId as Types.ObjectId,
        role: { $nin: denyRoles },
      },
      update: {
        role,
      },
    });

    if (!user) {
      throw new NotFoundException("fail to find matching result");
    }

    return successResponse({
      res,
    });
  };

  sendFriendRequest = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };
    const checkFriendRequestExists = await this.friendRequestModel.findOne({
      filter: {
        createdBy: { $in: [req.user?._id, userId] },
        sendTo: { $in: [req.user?._id, userId] },
      },
    });

    if (checkFriendRequestExists) {
      throw new ConflictException("friend request already exists");
    }

    const user = await this.userModel.findOne({
      filter: { _id: userId },
    });

    if (!user) {
      throw new NotFoundException("inValid recipient");
    }

    const [friendRequest] =
      (await this.friendRequestModel.create({
        data: [
          {
            createdBy: req.user?._id as Types.ObjectId,
            sendTo: userId,
          },
        ],
      })) || [];

    if (!friendRequest) {
      throw new BadRequestException("something went wrong😢");
    }

    return successResponse({
      res,
      statusCode: 201,
    });
  };

  acceptFriendRequest = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { requestId } = req.params as unknown as {
      requestId: Types.ObjectId;
    };
    const friendRequest = await this.friendRequestModel.findOneAndUpdate({
      filter: {
        _id: requestId,
        sendTo: req.user?._id,
        acceptedAt: { $exists: false },
      },
      update: {
        acceptedAt: new Date(),
      },
    });

    if (!friendRequest) {
      throw new NotFoundException("failed to find matching result");
    }

    await Promise.all([
      await this.userModel.updateOne({
        filter: { _id: friendRequest.createdBy },
        update: {
          $addToSet: { friends: friendRequest.sendTo },
        },
      }),

      await this.userModel.updateOne({
        filter: { _id: friendRequest.sendTo },
        update: {
          $addToSet: { friends: friendRequest.createdBy },
        },
      }),
    ]);

    return successResponse({
      res,
      statusCode: 201,
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
      expiresIn: 30,
    });

    return successResponse<IProfileImageResponse>({ res, data: { url } });
  };

  profileCoverImage = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
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

    return successResponse<ICoverImageResponse>({ res, data: { user } });
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
        _id: userId || req.user?._id,
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
      throw new NotFoundException(
        "user not found or fail to restore this user"
      );
    }

    return res.json({ message: "done" });
  };

  hardDeleteAccount = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { userId } = req.params as IHardDeleteAccountDto;

    const user = await this.userModel.deleteOne({
      filter: {
        _id: userId,
        freezedAt: { $exists: true },
      },
    });

    if (!user.deletedCount) {
      throw new NotFoundException("user not found or hard delete this account");
    }

    await deleteFolderByPrefix({
      path: `users/${userId}`,
    });

    return res.json({ message: "done" });
  };

  //GRAPHQL

  welcome = (user: HUserDocument): string => {
    return "hello graphQL";
  };

  allUsers = async (
    args: { gender: genderEnum },
    authUser: HUserDocument
  ): Promise<HUserDocument[]> => {
    return await this.userModel.find({
      filter: { _id: { $ne: authUser._id }, gender: args.gender },
    });
  };

  search = (args: {
    email: string;
  }): { message: string; statusCode: number; data: IUser } => {
    const user = users.find((ele) => ele.email === args.email);
    if (!user) {
      throw new GraphQLError("fail to find match result", {
        extensions: { statusCode: 404 },
      });
    }
    return { message: "Done", statusCode: 200, data: user };
  };

  addFollower = (args: { friendId: number; myId: number }): IUser[] => {
    users = users.map((ele: IUser): IUser => {
      if (ele.id === args.friendId) {
        ele.followers.push(args.myId);
      }
      return ele;
    });
    return users;
  };
}

export default new UserService();
