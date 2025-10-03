import { HPostDocument, LikeActionEnum } from "../../DB/models/post.model";
import { IAuthGraph } from "../graphQL/schema.interface.gql";
import { PostService } from "./post.service";

export class PostResolver {
  private postService: PostService = new PostService();
  constructor() {}

  allPosts = async (
    parent: unknown,
    args: { page: number; size: number },
    context: IAuthGraph
  ): Promise<{
    docsCount?: number;
    pages?: number;
    currentPage?: number | undefined;
    limit?: number;
    result: HPostDocument[];
  }> => {
    return await this.postService.allPosts(args, context.user);
  };




  likePost = async (
    parent: unknown,
    args: { postId: string; action: LikeActionEnum },
    context: IAuthGraph
  ): Promise<HPostDocument> => {
    return await this.postService.likeGraphPost(args, context.user);
  };
}
