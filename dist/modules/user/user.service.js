"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const token_security_1 = require("../../utils/security/token.security");
const user_model_1 = require("../../DB/models/user.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const error_response_1 = require("../../utils/response/error.response");
const s3_events_1 = require("../../utils/multer/s3.events");
const success_response_1 = require("../../utils/response/success.response");
const post_repository_1 = require("../../DB/repository/post.repository");
const post_model_1 = require("../../DB/models/post.model");
const friendRequest_repository_1 = require("../../DB/repository/friendRequest.repository");
const frinedRequest_mode_1 = require("../../DB/models/frinedRequest.mode");
const graphql_1 = require("graphql");
let users = [];
class UserService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    postModel = new post_repository_1.PostRepository(post_model_1.PostModel);
    friendRequestModel = new friendRequest_repository_1.FriendRequestRepository(frinedRequest_mode_1.FriendRequestModel);
    constructor() { }
    profile = async (req, res) => {
        const profile = await this.userModel.findById({
            id: req.user?._id,
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
            throw new error_response_1.NotFoundException("fail to find user profile");
        }
        return (0, success_response_1.successResponse)({
            res,
            data: { user: profile },
        });
    };
    dashboard = async (req, res) => {
        const results = await Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} }),
        ]);
        return (0, success_response_1.successResponse)({
            res,
            data: { results },
        });
    };
    changeRole = async (req, res) => {
        const { userId } = req.params;
        const { role } = req.body;
        const denyRoles = [role, user_model_1.roleEnum.superAdmin];
        if (req.user?.role === user_model_1.roleEnum.admin) {
            denyRoles.push(user_model_1.roleEnum.admin);
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId,
                role: { $nin: denyRoles },
            },
            update: {
                role,
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("fail to find matching result");
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    sendFriendRequest = async (req, res) => {
        const { userId } = req.params;
        const checkFriendRequestExists = await this.friendRequestModel.findOne({
            filter: {
                createdBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            },
        });
        if (checkFriendRequestExists) {
            throw new error_response_1.ConflictException("friend request already exists");
        }
        const user = await this.userModel.findOne({
            filter: { _id: userId },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("inValid recipient");
        }
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [
                {
                    createdBy: req.user?._id,
                    sendTo: userId,
                },
            ],
        })) || [];
        if (!friendRequest) {
            throw new error_response_1.BadRequestException("something went wrong😢");
        }
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
        });
    };
    acceptFriendRequest = async (req, res) => {
        const { requestId } = req.params;
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
            throw new error_response_1.NotFoundException("failed to find matching result");
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
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201,
        });
    };
    profileImage = async (req, res) => {
        const key = await (0, s3_config_1.uploadLargeFile)({
            file: req.file,
            path: `users/${req.decoded?._id}`,
            storageApproach: cloud_multer_1.storageEnum.disk,
        });
        return res.json({
            message: "done",
            data: {
                key,
            },
        });
    };
    preSignedUpUrl = async (req, res) => {
        const { ContentType, originalname, } = req.body;
        const { url, Key } = await (0, s3_config_1.createPreSignedUpLoadLink)({
            ContentType,
            originalname,
            path: `users/${req.decoded?._id}`,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req?.user?._id,
            update: {
                profileImage: Key,
                temProfileImage: req.user?.profileImage,
            },
        });
        if (!user) {
            throw new error_response_1.BadRequestException("failed to update user profile-image");
        }
        s3_events_1.s3Event.emit("trackProfileImageUpload", {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            Key,
            expiresIn: 30,
        });
        return (0, success_response_1.successResponse)({ res, data: { url } });
    };
    profileCoverImage = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            files: req.files,
            path: `users/${req.decoded?._id}/cover`,
            storageApproach: cloud_multer_1.storageEnum.disk,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                coverImages: urls,
            },
        });
        if (!user) {
            throw new error_response_1.BadRequestException("failed to update profile cover images");
        }
        if (req.user?.coverImages) {
            await (0, s3_config_1.deleteFiles)({ urls: req.user.coverImages });
        }
        return (0, success_response_1.successResponse)({ res, data: { user } });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        const update = {};
        switch (flag) {
            case token_security_1.logoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
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
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return res.status(201).json({ message: "Done", data: { credentials } });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params || {};
        if (userId && req.user?.role !== user_model_1.roleEnum.admin) {
            throw new error_response_1.ForbiddenException("not authorized account");
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
            throw new error_response_1.NotFoundException("user not found or fail to delete this user");
        }
        return res.json({ message: "done" });
    };
    restoreAccount = async (req, res) => {
        const { userId } = req.params;
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
            throw new error_response_1.NotFoundException("user not found or fail to restore this user");
        }
        return res.json({ message: "done" });
    };
    hardDeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedAt: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException("user not found or hard delete this account");
        }
        await (0, s3_config_1.deleteFolderByPrefix)({
            path: `users/${userId}`,
        });
        return res.json({ message: "done" });
    };
    welcome = (user) => {
        return "hello graphQL";
    };
    allUsers = async (args, authUser) => {
        return await this.userModel.find({
            filter: { _id: { $ne: authUser._id }, gender: args.gender },
        });
    };
    search = (args) => {
        const user = users.find((ele) => ele.email === args.email);
        if (!user) {
            throw new graphql_1.GraphQLError("fail to find match result", {
                extensions: { statusCode: 404 },
            });
        }
        return { message: "Done", statusCode: 200, data: user };
    };
    addFollower = (args) => {
        users = users.map((ele) => {
            if (ele.id === args.friendId) {
                ele.followers.push(args.myId);
            }
            return ele;
        });
        return users;
    };
}
exports.UserService = UserService;
exports.default = new UserService();
