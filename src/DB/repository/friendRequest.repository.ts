import { Model } from "mongoose";
import { DatabaseRepository } from "./database.repository";
import { IFriendRequest as TDocument } from "./../models/frinedRequest.mode";

export class FriendRequestRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }
}
