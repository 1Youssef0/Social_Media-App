import { HUserDocument } from "../../DB/models/user.model";

export interface IProfileImageResponse {
    url:string;
}

export interface ICoverImageResponse {
    user : Partial<HUserDocument>
}