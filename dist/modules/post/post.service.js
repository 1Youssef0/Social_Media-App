"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = exports.PostService = exports.postAvailability = void 0;
const success_response_1 = require("../../utils/response/success.response");
const post_repository_1 = require("../../DB/repository/post.repository");
const post_model_1 = require("../../DB/models/post.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const user_model_1 = require("../../DB/models/user.model");
const error_response_1 = require("../../utils/response/error.response");
const s3_config_1 = require("../../utils/multer/s3.config");
const uuid_1 = require("uuid");
const mongoose_1 = require("mongoose");
const graphql_1 = require("graphql");
const postAvailability = (user) => {
    return [
        { availability: post_model_1.AvailabilityEnum.public },
        { availability: post_model_1.AvailabilityEnum.onlyMe, createdBy: user._id },
        {
            availability: post_model_1.AvailabilityEnum.friends,
            createdBy: { $in: [...(user?.friends || []), user._id] },
        },
        {
            availability: { $ne: post_model_1.AvailabilityEnum.onlyMe },
            tags: { $in: user._id },
        },
    ];
};
exports.postAvailability = postAvailability;
class PostService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    postModel = new post_repository_1.PostRepository(post_model_1.PostModel);
    constructor() { }
    createPost = async (req, res) => {
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: { _id: { $in: req.body.tags }, paranoid: false },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some of the mentioned users are not exists");
        }
        let attachments = [];
        let assetsFolderId = (0, uuid_1.v4)();
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `users/${req.user?._id}/post/${assetsFolderId}`,
            });
        }
        const [post] = (await this.postModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    assetsFolderId,
                    createdBy: req.user?._id,
                },
            ],
        })) || [];
        if (!post) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("Fail to create this post");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    updatePost = async (req, res) => {
        const { postId } = req.params;
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user?._id,
            },
        });
        if (!post) {
            throw new error_response_1.NotFoundException("fail to find matching results");
        }
        if (req.body.tags?.length &&
            (await this.userModel.find({
                filter: {
                    _id: { $in: req.body.tags, $ne: req.user?._id },
                    paranoid: false,
                },
            })).length !== req.body.tags.length) {
            throw new error_response_1.NotFoundException("some of the mentioned users are not exists");
        }
        let attachments = [];
        if (req.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                files: req.files,
                path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
            });
        }
        const updatePost = await this.postModel.updateOne({
            filter: { _id: post._id },
            update: [
                {
                    $set: {
                        content: req.body.content,
                        allowComments: req.body.allowComments || post.allowComments,
                        availability: req.body.availability || post.availability,
                        __v: { $add: ["__v", 1] },
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "attachments",
                                        req.body.removedAttachments || [],
                                    ],
                                },
                                attachments,
                            ],
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "tags",
                                        (req.body.removedTags || []).map((tag) => {
                                            return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                        }),
                                    ],
                                },
                                (req.body.tags || []).map((tag) => {
                                    return mongoose_1.Types.ObjectId.createFromHexString(tag);
                                }),
                            ],
                        },
                    },
                },
            ],
        });
        if (!updatePost.matchedCount) {
            if (attachments.length) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments });
            }
            throw new error_response_1.BadRequestException("Fail to create this post");
        }
        else {
            if (req.body.removedAttachments?.length) {
                await (0, s3_config_1.deleteFiles)({ urls: req.body.removedAttachments });
            }
        }
        return (0, success_response_1.successResponse)({ res });
    };
    likePost = async (req, res) => {
        const { postId } = req.params;
        const { action } = req.query;
        let update = {
            $addToSet: { likes: req.user?._id },
        };
        if (action === post_model_1.LikeActionEnum.unlike) {
            update = { $pull: { likes: req.user?._id } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, exports.postAvailability)(req.user),
            },
            update,
        });
        if (!post) {
            throw new error_response_1.NotFoundException("InValid postId or post not exists");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    postList = async (req, res) => {
        let { page, size } = req.query;
        const posts = await this.postModel.paginate({
            filter: {
                $or: (0, exports.postAvailability)(req.user),
            },
            options: {
                populate: [
                    {
                        path: "comments",
                        match: {
                            commentId: { $exists: false },
                            freezedAt: { $exists: false },
                        },
                        populate: [
                            {
                                path: "reply",
                                match: {
                                    commentId: { $exists: false },
                                    freezedAt: { $exists: false },
                                },
                            },
                        ],
                    },
                ],
            },
            page,
            size,
        });
        return (0, success_response_1.successResponse)({ res, data: { posts } });
    };
    allPosts = async ({ page, size }, authUser) => {
        const posts = await this.postModel.paginate({
            filter: {
                $or: (0, exports.postAvailability)(authUser),
            },
            options: {
                populate: [
                    {
                        path: "comments",
                        match: {
                            commentId: { $exists: false },
                            freezedAt: { $exists: false },
                        },
                        populate: [
                            {
                                path: "reply",
                                match: {
                                    commentId: { $exists: false },
                                    freezedAt: { $exists: false },
                                },
                            },
                        ],
                    },
                    {
                        path: "createdBy",
                    },
                ],
            },
            page,
            size,
        });
        return posts;
    };
    likeGraphPost = async ({ postId, action }, authUser) => {
        let update = {
            $addToSet: { likes: authUser._id },
        };
        if (action === post_model_1.LikeActionEnum.unlike) {
            update = { $pull: { likes: authUser._id } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: (0, exports.postAvailability)(authUser),
            },
            update,
        });
        if (!post) {
            throw new graphql_1.GraphQLError("InValid postId or post not exists", {
                extensions: { statusCode: 404 },
            });
        }
        return post;
    };
}
exports.PostService = PostService;
exports.postService = new PostService();
