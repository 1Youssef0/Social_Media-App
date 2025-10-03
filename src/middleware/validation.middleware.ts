import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import { z } from "zod";
import { Types } from "mongoose";
import { GraphQLError } from "graphql";

type keyReqType = keyof Request;
type schemaType = Partial<Record<keyReqType, ZodType>>;
type validationErrorsType = Array<{
  key: keyReqType;
  issues: Array<{
    message: string;
    path: (string | number | symbol | undefined)[];
  }>;
}>;

export const validation = (schema: schemaType) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction => {
    const validationErrors: validationErrorsType = [];

    for (const key of Object.keys(schema) as keyReqType[]) {
      if (!schema[key]) {
        continue;
      }

      if (req.file) {
        req.body.attachment = req.file;
      }

      if (req.files) {
        req.body.attachments = req.files;
      }

      const validationResult = schema[key].safeParse(req[key]);
      if (!validationResult.success) {
        const errors = validationResult.error as ZodError;
        validationErrors.push({
          key,
          issues: errors.issues.map((issue) => {
            return { message: issue.message, path: issue.path };
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

export const graphValidation = async <T = any>(schema: ZodType, args: T) => {
  const validationResult = await schema.safeParseAsync(args);
  if (!validationResult.success) {
    const errors = validationResult.error as ZodError;
    throw new GraphQLError("validation Error", {
      extensions: {
        statusCode: 400,
        issues: {
          key: "args",
          issues: errors.issues.map((issue) => {
            return { path: issue.path, message: issue.message };
          }),
        },
      },
    });
  }
};

export const generalFields = {
  firstName: z.string().min(2).max(20),
  lastName: z.string().min(2).max(20),
  // userName: z.string().min(2).max(20),
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/),
  password: z
    .string()
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-z])(?=.*[a-zA-Z]).{8,}$/),
  confirmPassword: z.string(),
  file: function (mimetype: string[]) {
    return z
      .strictObject({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.enum(mimetype),
        buffer: z.any().optional(),
        path: z.string().optional(),
        size: z.number(),
      })
      .refine(
        (data) => {
          return data.buffer || data.path;
        },
        {
          error: "neither path or buffer is available",
          path: ["file"],
        }
      );
  },
  id: z.string().refine(
    (data) => {
      return Types.ObjectId.isValid(data);
    },
    { error: "In-Valid ObjectId format" }
  ),
};
