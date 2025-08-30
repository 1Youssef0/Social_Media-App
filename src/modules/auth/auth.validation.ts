import { z } from "zod";
import { generalFields } from "../../middleware/validation.middleware";

export const signup = {
  body: z
    .object({
      firstName: generalFields.firstName,
      lastName: generalFields.lastName,
      // userName:generalFields.userName,
      email: generalFields.email,
      password: generalFields.password,
      confirmPassword: generalFields.confirmPassword,
    })
    .superRefine((data, ctx) => {
      if (data.confirmPassword !== data.password) {
        ctx.addIssue({
          code: "custom",
          path: ["confirm Password"],
          message: "password mismatch confirmPassword",
        });
      }

      // if (data.userName?.split(" ")?.length !=2) {
      //     ctx.addIssue({
      //         code:"custom",
      //         path:["user Name"],
      //         message:"userName must consists of 2 parts ,ex:JOHN DOE"
      //     })
      // }
    }),
  // .refine((data)=>{
  //     return data.confirmPassword === data.password
  // },{
  //     error:"password mismatch confirmPassword"
  // })
};

export const login = {
  body: z.object({
    email: generalFields.email,
    password: generalFields.password,
  }),
};

export const confirmEmail = {
  body: z.strictObject({
    email: generalFields.email,
    otp: generalFields.otp,
  }),
};

export const signupWithGmail = {
  body: z.strictObject({
    idToken: z.string(),
  }),
};

export const sendForgotCode = {
  body: z.strictObject({
    email: generalFields.email,
  }),
};

export const verifySendForgotCode = {
  body: z.strictObject({
    email: generalFields.email,
    otp: generalFields.otp,
  }),
};

export const resetForgotPassword = {
  body: z.strictObject({
    email: generalFields.email,
    password: generalFields.password,
    otp: generalFields.otp,
    confirmPassword:generalFields.confirmPassword
  }).refine((data)=>{
    return data.password === data.confirmPassword
  },{
    message:"password mismatch with confirm-password",
    path:["confirm-password"]
  }),
};
