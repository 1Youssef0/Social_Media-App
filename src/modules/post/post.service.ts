import { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { PostRepository } from "../../DB/repository/post.repository";
import {
  AvailabilityEnum,
  HPostDocument,
  LikeActionEnum,
  PostModel,
} from "../../DB/models/post.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { UserModel } from "../../DB/models/user.model";
import {
  BadRequestException,
  NotFoundException,
} from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { v4 as uuid } from "uuid";
import { LikePostQueryInputsDto } from "./post.dto";
import { Types, UpdateQuery } from "mongoose";
export const postAvailability = (req: Request) => {
  return [
    { availability: AvailabilityEnum.public },
    { availability: AvailabilityEnum.onlyMe, createdBy: req.user?._id },
    {
      availability: AvailabilityEnum.friends,
      createdBy: { $in: [...(req.user?.friends || []), req.user?._id] },
    },
    {
      availability: { $ne: AvailabilityEnum.onlyMe },
      tags: { $in: req.user?._id },
    },
  ];
};

class PostService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  constructor() {}

  createPost = async (req: Request, res: Response): Promise<Response> => {
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags }, paranoid: false },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotFoundException("some of the mentioned users are not exists");
    }

    let attachments: string[] = [];
    let assetsFolderId: string = uuid();
    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req.user?._id}/post/${assetsFolderId}`,
      });
    }

    const [post] =
      (await this.postModel.create({
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
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Fail to create this post");
    }
    return successResponse({ res, statusCode: 201 });
  };

  updatePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        createdBy: req.user?._id,
      },
    });

    if (!post) {
      throw new NotFoundException("fail to find matching results");
    }

    // if (req.body.removedAttachments?.length && post.attachments?.length) {
    //   post.attachments = post.attachments.filter((attachments: string) => {
    //     if (!req.body.removedAttachments.includes(attachments)) {
    //       return attachments;
    //     }
    //     return;
    //   });
    // }

    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: {
            _id: { $in: req.body.tags, $ne: req.user?._id },
            paranoid: false,
          },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotFoundException("some of the mentioned users are not exists");
    }

    let attachments: string[] = [];
    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
      // post.attachments = [...(post.attachments || []), ...attachments];
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
                    (req.body.removedTags || []).map((tag: string) => {
                      return Types.ObjectId.createFromHexString(tag);
                    }),
                  ],
                },
                (req.body.tags || []).map((tag: string) => {
                  return Types.ObjectId.createFromHexString(tag);
                }),
              ],
            },
          },
        },
      ],
    });

    // const updatePost = await this.userModel.updateOne({
    //   filter: { _id: post._id },
    //   update: {
    //     content: req.body.content,
    //     allowComments: req.body.allowComments || post.allowComments,
    //     availability: req.body.availability || post.availability,

    //     $addToSet: {
    //       attachments: { $each: attachments || [] },
    //       tags: { $each: req.body.tags || [] },
    //     },

    //     // attachments:post.attachments ,
    //     // $addToSet: {
    //     //   attachments: { $each: attachments || [] },
    //     //   tags: { $each: req.body.tags || [] },
    //     // },
    //     // $pull: {
    //     //   attachments: { $in: req.body.removedAttachments || [] },
    //     // tags: { $in: req.body.removedTags || [] },
    //     // },
    //   },
    // });

    // const updatePost2 = await this.userModel.updateOne({
    //   filter: { _id: post._id },
    //   update: {
    //     $pull: {
    //       attachments: { $in: req.body.removedAttachments || [] },
    //       tags: { $in: req.body.removedTags || [] },
    //     },
    //   },
    // });

    if (!updatePost.matchedCount) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Fail to create this post");
    } else {
      if (req.body.removedAttachments?.length) {
        await deleteFiles({ urls: req.body.removedAttachments });
      }
    }

    return successResponse({ res });
  };

  likePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as { postId: string };
    const { action } = req.query as LikePostQueryInputsDto;
    let update: UpdateQuery<HPostDocument> = {
      $addToSet: { likes: req.user?._id },
    };
    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: req.user?._id } };
    }

    const post = await this.postModel.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: postAvailability(req),
      },
      update,
    });

    if (!post) {
      throw new NotFoundException("InValid postId or post not exists");
    }

    return successResponse({ res });
  };

  postList = async (req: Request, res: Response): Promise<Response> => {
    let { page, size } = req.query as unknown as { page: number; size: number };
    const posts = await this.postModel.paginate({
      filter: {
        $or: postAvailability(req),
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

    // const posts = await this.postModel.findCursor({
    //   filter: {
    //     $or: postAvailability(req),
    //   },
    // });

    return successResponse({ res, data: { posts } });
  };
}

export const postService = new PostService();
 








