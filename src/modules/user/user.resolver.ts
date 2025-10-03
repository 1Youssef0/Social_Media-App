import { genderEnum, HUserDocument } from "../../DB/models/user.model";
import { graphAuthorization } from "../../middleware/authentication.middleware";
import { graphValidation } from "../../middleware/validation.middleware";
import { IAuthGraph } from "../graphQL/schema.interface.gql";
import { endPoint } from "./user.authorization";
import { IUser, UserService } from "./user.service";
import * as validators from "./user.validation";

export class UserResolver {
  private userService: UserService = new UserService();
  constructor() {}

  welcome = async (
    parent: unknown,
    args: { name: string },
    context: IAuthGraph
  ): Promise<string> => {
    await graphValidation<{ name: string }>(validators.welcome, args);
    await graphAuthorization(endPoint.welcome, context.user.role);
    return this.userService.welcome(context.user);
  };

  allUsers = async (
    parent: unknown,
    args: { gender: genderEnum },
    context:IAuthGraph
  ): Promise<HUserDocument[]> => {
    return await this.userService.allUsers(args , context.user);
  };

  search = (
    parent: unknown,
    args: { email: string }
  ): { message: string; statusCode: number; data: IUser } => {
    return this.userService.search(args);
  };

  //MUTATION

  addFollower = (
    parent: unknown,
    args: { friendId: number; myId: number }
  ): IUser[] => {
    return this.userService.addFollower(args);
  };
}
