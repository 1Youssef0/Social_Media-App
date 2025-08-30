import { NextFunction, Request, Response } from "express";
import { BadRequestException, ForbiddenException } from "../utils/response/error.response";
import { decodedToken, TokenEnum } from "../utils/security/token.security";
import { roleEnum } from "../DB/models/user.model";

export const authentication = (tokenType:TokenEnum = TokenEnum.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new BadRequestException("validation error", {
        key: "headers",
        issues: [{ path: "authorization", message: "missing authorization" }],
      });
    }
    const { decoded, user } = await decodedToken({
      authorization: req.headers.authorization,
      tokenType,
    });

    req.user = user;
    req.decoded = decoded;
    next();
  };
};

export const authorization = (accessRoles:roleEnum[] = [] , tokenType:TokenEnum = TokenEnum.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new BadRequestException("validation error", {
        key: "headers",
        issues: [{ path: "authorization", message: "missing authorization" }],
      });
    }
    const { decoded, user } = await decodedToken({
      authorization: req.headers.authorization,
      tokenType
    });

    if (!accessRoles.includes(user.role)) {
        throw new ForbiddenException("not authorized account")
    }

    req.user = user;
    req.decoded = decoded;
    next();
  };
};
