import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import {z} from "zod"


type keyReqType = keyof Request;
type schemaType = Partial<Record<keyReqType, ZodType>>;
type validationErrorsType = Array<{
  key: keyReqType;
  issues: Array<{
    message: string;
    path: string | number | symbol | undefined;
  }>;
}>;

export const validation = (schema: schemaType) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction => {

    const validationErrors: validationErrorsType = [];

    for (const key of Object.keys(schema) as keyReqType[]) {
      if (!schema[key]) {
        continue;
      }
      const validationResult = schema[key].safeParse(req[key]);
      if (!validationResult.success) {
        const errors = validationResult.error as ZodError;
        validationErrors.push({
          key,
          issues: errors.issues.map((issue) => {
            return { message: issue.message, path: issue.path[0] };
          }),
        });
      }
    }

    if (validationErrors.length) {
      throw new BadRequestException("Validation Error", { validationErrors });
    }

    return next() as unknown as NextFunction;
  };
};


export const generalFields = {
            firstName: z.string().min(2).max(20),
            lastName: z.string().min(2).max(20),
            // userName: z.string().min(2).max(20),
            email: z.email(),
            otp: z.string().regex(/^\d{6}$/),
            password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-z])(?=.*[a-zA-Z]).{8,}$/),
            confirmPassword: z.string()
}