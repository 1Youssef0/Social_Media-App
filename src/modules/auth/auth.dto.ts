// export interface ISignupBodyInputsDTO {
//     userName:string;
//     email:string;
//     password:string; 
// }

import * as validators from "./auth.validation"

import {z} from "zod"

export type ISignupBodyInputsDtoType = z.infer<typeof validators.signup.body>
export type ILoginBodyInputsDtoType = z.infer<typeof validators.login.body>
export type IForgotCodeBodyInputsDtoType = z.infer<typeof validators.sendForgotCode.body>
export type IVerifyForgotCodeBodyInputsDtoType = z.infer<typeof validators.verifySendForgotCode.body>
export type IResetForgotCodeBodyInputsDtoType = z.infer<typeof validators.resetForgotPassword.body>
export type IGmail = z.infer<typeof validators.signupWithGmail.body>
export type IConfirmEmailInputsDtoType = z.infer<typeof validators.confirmEmail.body>