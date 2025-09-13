import type { Request, Response } from "express";
import {
  IConfirmEmailInputsDtoType,
  IForgotCodeBodyInputsDtoType,
  IGmail,
  ILoginBodyInputsDtoType,
  IResetForgotCodeBodyInputsDtoType,
  ISignupBodyInputsDtoType,
  IVerifyForgotCodeBodyInputsDtoType,
} from "./auth.dto";
import { providerEnum, UserModel } from "../../DB/models/user.model";
import { UserRepository } from "../../DB/repository/user.repository";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/events/email.events";
import { generateNumberOtp } from "../../utils/otp";
import { createLoginCredentials } from "../../utils/security/token.security";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { successResponse } from "../../utils/response/success.response";
import { ILoginResponse } from "./auth.entites";

class authenticationService {
  private userModel = new UserRepository(UserModel);
  constructor() {}

  private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
    });
    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      throw new BadRequestException("failed to verify this google account");
    }
    return payload;
  }

  loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmail = req.body;
    const { email } = await this.verifyGmailAccount(idToken);
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: providerEnum.GOOGLE,
      },
    });

    if (!user) {
      throw new NotFoundException(
        "not registered account or registered with another account"
      );
    }

    const credentials = await createLoginCredentials(user);

        return successResponse<ILoginResponse>({res,data:{credentials}})
  };

  signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmail = req.body;
    const { email, family_name, given_name, picture } =
      await this.verifyGmailAccount(idToken);
    const user = await this.userModel.findOne({
      filter: {
        email,
      },
    });

    if (user) {
      if (user.provider === providerEnum.GOOGLE) {
        return await this.loginWithGmail(req, res);
      }
      throw new ConflictException("Email exist with another provider");
    }

    const [newUser] =
      (await this.userModel.create({
        data: [
          {
            email: email as string,
            firstName: given_name as string,
            lastName: family_name as string,
            profileImage: picture as string,
            confirmedAt: new Date(),
            provider: providerEnum.GOOGLE,
          },
        ],
      })) || [];

    if (!newUser) {
      throw new BadRequestException(
        "Fail to signup with gmail , please Try again later 😢"
      );
    }

    const credentials = await createLoginCredentials(newUser);

        return successResponse<ILoginResponse>({res, statusCode:201 ,data:{credentials}})
  };

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { firstName, lastName, email, password }: ISignupBodyInputsDtoType =
      req.body;

    //check user exists ?
    const checkUserExists = await this.userModel.findOne({
      filter: { email },
      select: "email",
      options: {
        lean: false,
      },
    });
    if (checkUserExists) {
      throw new ConflictException("Email Already Exists");
    }
    const otp = generateNumberOtp();
    console.log(otp);

    //create a new user
     await this.userModel.createUser({
      data: [
        {
          firstName,
          lastName,
          email,
          password,
          confirmEmailOtp: String(otp),
        },
      ],
      // options:{validateBeforeSave:true}
    });


    return successResponse({res , statusCode:201 })

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
  };

  confirmEmail = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp }: IConfirmEmailInputsDtoType = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        confirmEmailOtp: { $exists: true },
        confirmedAt: { $exists: false },
      },
    });

    if (!user) {
      throw new NotFoundException("Invalid Account ");
    }

    if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
      throw new ConflictException("InValid confirmation code");
    }

    await this.userModel.updateOne({
      filter: { email },
      update: {
        confirmedAt: new Date(),
        $unset: { confirmEmailOtp: true },
      },
    });

    return successResponse({res})
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: ILoginBodyInputsDtoType = req.body;

    const user = await this.userModel.findOne({
      filter: { email, provider: providerEnum.SYSTEM },
    });
    if (!user) {
      throw new NotFoundException("In-Valid Login data");
    }
    if (!user.confirmedAt) {
      throw new BadRequestException("verify your account first , please😊");
    }
    if (!(await compareHash(password, user.password))) {
      throw new NotFoundException("In-Valid Login data");
    }

    const credentials = await createLoginCredentials(user);

    return successResponse<ILoginResponse>({res,data:{credentials}})
  };

  sendForgotCode = async (req: Request, res: Response): Promise<Response> => {
    const { email }: IForgotCodeBodyInputsDtoType = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: providerEnum.SYSTEM,
        confirmedAt: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException("In-Valid account");
    }

    const otp = generateNumberOtp();
    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        resetPasswordOtp: await generateHash(String(otp)),
      },
    });

    if (!result.matchedCount) {
      throw new BadRequestException(
        "failed to send the reset code ,please try again later😢"
      );
    }

    emailEvent.emit("resetPassword", { to: email, html: String(otp) });

     return successResponse({res})

  };

  verifySendForgotCode = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp }: IVerifyForgotCodeBodyInputsDtoType = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: providerEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException("In-Valid account");
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("In-Valid otp");
    }

      return successResponse({res})

  };


  resetForgotPassword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp, password }: IResetForgotCodeBodyInputsDtoType =
      req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: providerEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException("In-Valid account");
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("In-Valid otp");
    }

    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        password: await generateHash(password),
        changeCredentialsTime: new Date(),
        $unset: { resetPasswordOtp: true },
      },
    });

    if (!result.matchedCount) {
      throw new BadRequestException(
        "failed to reset password ,please try again later😢"
      );
    }

    return successResponse({res})

  };
}

export default new authenticationService();
