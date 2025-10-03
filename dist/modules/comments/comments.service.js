"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const success_response_1 = require("../../utils/response/success.response");
const user_repository_1 = require("../../DB/repository/user.repository");
const user_model_1 = require("../../DB/models/user.model");
const post_model_1 = require("../../DB/models/post.model");
const comment_model_1 = require("../../DB/models/comment.model");
const comment_repository_1 = require("../../DB/repository/comment.repository");
const post_repository_1 = require("../../DB/repository/post.repository");
const post_1 = require("../post");
const error_response_1 = require("../../utils/response/error.response");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
class CommentService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    postModel = new post_repository_1.PostRepository(post_model_1.PostModel);
    commentModel = new comment_repository_1.CommentRepository(comment_model_1.CommentModel);
    constructor() { }
    createComment = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                allowComments: post_model_1.AllowCommentsEnum.allow,
                $or: (0, post_1.postAvailability)(req.user),
            },
        });
        if (!post) {
            throw new error_response_1.NotFoundException("fail to find matching result");
        }
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: { _id: { $in: req.body.tags }, paranoid: false },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some of the mentioned users are not exists");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.storageEnum.memory,
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
            });
        }
        const [comment] = (await this.commentModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    postId,
                    createdBy: req.user?._id,
                },
            ],
        })) || [];
        if (!comment) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("Fail to generate this comment");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    replyOnComment = async (req, res) => {
        const { postId, commentId } = req.params;
        const comment = await this.commentModel.findOne({
            filter: {
                _id: postId,
                postId,
            },
            options: {
                populate: [
                    {
                        path: "postId",
                        match: {
                            allowComments: post_model_1.AllowCommentsEnum.allow,
                            $or: (0, post_1.postAvailability)(req.user),
                        },
                    },
                ],
            },
        });
        if (!comment?.postId) {
            throw new error_response_1.NotFoundException("fail to find matching result");
        }
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: { _id: { $in: req.body.tags }, paranoid: false },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some of the mentioned users are not exists");
        }
        let attachments = [];
        if (req.files?.length) {
            const post = comment.postId;
            attachments = await (0, s3_config_1.uploadFiles)({
                storageApproach: cloud_multer_1.storageEnum.memory,
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
            });
        }
        const [reply] = (await this.commentModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    postId,
                    commentId,
                    createdBy: req.user?._id,
                },
            ],
        })) || [];
        if (!reply) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("Fail to generate this comment");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
}
exports.default = new CommentService();
