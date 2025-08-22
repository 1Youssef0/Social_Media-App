// export interface ISignupBodyInputsDTO {
//     userName:string;
//     email:string;
//     password:string; 
// }

import * as validators from "./auth.validation"

import {z} from "zod"

export type ISignupBodyInputsDtoType = z.infer<typeof validators.signup.body>