import { PostResolver } from "./post.resolver";
import * as gqlArgs from "./post.args.gql";
import * as gqlTypes from "./post.types.gql";

class PostGQLSchema {
  private postResolver: PostResolver = new PostResolver();
  constructor() {}

  registerQuery = () => {
    return {
      allPosts: {
        types:gqlTypes.allPosts,
        args: gqlArgs.allPosts,
        resolve: this.postResolver.allPosts,
      },
    };
  };


  registerMutation = () => {
    return {
      allPosts: {
        types:gqlTypes.GraphQLOnePostResponse,
        args: gqlArgs.likePost,
        resolve: this.postResolver.likePost,
      },
    };
  };
}

export default new PostGQLSchema()