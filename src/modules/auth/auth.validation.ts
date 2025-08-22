import {z} from "zod"
import { generalFields } from "../../middleware/validation.middleware"


export const signup = {
    body: z.object({
        userName:generalFields.userName,
        email: generalFields.email,
        password: generalFields.password,
        confirmPassword: generalFields.confirmPassword
    }).superRefine((data , ctx)=>{
        
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code:"custom",
                path:["confirm Password"],
                message:"password mismatch confirmPassword"
            })
        }


        if (data.userName?.split(" ")?.length !=2) {
            ctx.addIssue({
                code:"custom",
                path:["user Name"],
                message:"userName must consists of 2 parts ,ex:JOHN DOE"
            })
        }


    })
    // .refine((data)=>{
    //     return data.confirmPassword === data.password
    // },{
    //     error:"password mismatch confirmPassword"
    // })
}




export const login = {
    body: z.object({
        email:generalFields.email,
        password: generalFields.password,
        confirmPassword: generalFields.confirmPassword
    }).superRefine((data , ctx)=>{
        
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code:"custom",
                path:["confirm Password"],
                message:"password mismatch confirmPassword"
            })
        }

    })

}

