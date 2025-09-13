import { Model } from "mongoose";
import {  IPost as TDocument} from "../models/post.model";
import { DatabaseRepository } from "./database.repository";

export class PostRepository extends DatabaseRepository<TDocument>{
    constructor(protected override readonly model:Model<TDocument>){
        super(model)
    }
}