"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_security_1 = require("../../utils/security/token.security");
const user_model_1 = require("../../DB/models/user.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const error_response_1 = require("../../utils/response/error.response");
const s3_events_1 = require("../../utils/multer/s3.events");
const success_response_1 = require("../../utils/response/success.response");
class UserService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    constructor() { }
    profile = async (req, res) => {
        return res.json({
            message: "done",
            data: {
                user: req.user,
                decoded: req.decoded,
            },
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
            expiresIn: 30000,
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
            }
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException("user not found or hard delete this account");
        }
        await (0, s3_config_1.deleteFolderByPrefix)({
            path: `users/${userId}`
        });
        return res.json({ message: "done" });
    };
}
exports.default = new UserService();
