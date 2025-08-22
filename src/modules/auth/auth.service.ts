import type { Request, Response } from "express";
import { ISignupBodyInputsDtoType } from "./auth.dto";
import { userModel } from "../../DB/models/user.model";
import { BadRequestException } from "../../utils/response/error.response";


class authenticationService {
    constructor() {}
    
    signup = async (req: Request, res: Response ): Promise <Response>  => {
        let {userName , email , password}:ISignupBodyInputsDtoType = req.body
        console.log({userName , email , password});

        const checkUserExists = await userModel.findOne({email})
        if (checkUserExists) {
            throw new BadRequestException("Email Exists")
        }
        const user = await userModel.create(req.body)
        return res.status(201).json({ message: "signed-up successfully", data: user });
        

    // try {
    //     validators.signup.body.parse(req.body)
    // } catch (error) {
    //     throw new BadRequestException("validation_error" ,{
    //         issues:JSON.parse(error as string)
    //     })
    // }


    // try {
    //   await  validators.signup.body.parseAsync(req.body)
    // } catch (error) {
    //     throw new BadRequestException("validation_error" ,{
    //         issues:JSON.parse(error as string)
    //     })
    // }

    // await validators.signup.body.parseAsync(req.body).catch((error)=>{
    //         throw new BadRequestException("validation_error" ,{
    //             issues:JSON.parse(error as string)
    //         })
    // })

    // const validationResult = validators.signup.body.safeParse(req.body)
    // if (!validationResult.success) {
    //                 throw new BadRequestException("validation_error" ,{
    //             issues:JSON.parse(validationResult.error as unknown as string)
    //         })
    // }   


  }

    login = (req: Request, res: Response): Response => {  
    return res.status(201).json({ message: "logged successfully", data: req.body });
  }
}

export default new authenticationService();
