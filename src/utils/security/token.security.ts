import type { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { sign, verify } from "jsonwebtoken";
import { HUserDocument, roleEnum, UserModel } from "../../DB/models/user.model";
import {
  BadRequestException,
  UnAuthorizedException,
} from "../response/error.response";
import { UserRepository } from "../../DB/repository/user.repository";
import { v4 as uuid } from "uuid";
import { TokenRepository } from "../../DB/repository/token.repository";
import { HTokenDocument, TokenModel } from "../../DB/models/token.model";
import { JwtPayload } from "./../../../node_modules/@types/jsonwebtoken/index.d";

export enum SignatureLevelEnum {
  Bearer = "Bearer",
  System = "System",
}

export enum TokenEnum {
  access = "access",
  refresh = "refresh",
}
export enum logoutEnum {
  only = "only",
  all = "all",
}

export const generateToken = async ({
  payload,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
  options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
}: {
  payload: object;
  secret: Secret;
  options?: SignOptions;
}): Promise<string> => {
  return sign(payload, secret, options);
};

export const verifyToken = async ({
  token,
  secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
}: {
  token: string;
  secret?: Secret;
}): Promise<JwtPayload> => {
  return verify(token, secret) as JwtPayload;
};

export const detectSignatureLevel = async (
  role: roleEnum = roleEnum.user
): Promise<SignatureLevelEnum> => {
  let signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer;

  switch (role) {
    case roleEnum.admin:
      signatureLevel = SignatureLevelEnum.System;
      break;
    default:
      signatureLevel = SignatureLevelEnum.Bearer;
      break;
  }

  return signatureLevel;
};

export const getSignatures = async (
  signatureLevel: SignatureLevelEnum = SignatureLevelEnum.Bearer
): Promise<{ access_signature: string; refresh_signature: string }> => {
  let signatures: { access_signature: string; refresh_signature: string } = {
    access_signature: "",
    refresh_signature: "",
  };

  switch (signatureLevel) {
    case SignatureLevelEnum.System:
      signatures.access_signature = process.env
        .ACCESS_SYSTEM_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env
        .REFRESH_SYSTEM_TOKEN_SIGNATURE as string;
      break;
    default:
      signatures.access_signature = process.env
        .ACCESS_USER_TOKEN_SIGNATURE as string;
      signatures.refresh_signature = process.env
        .REFRESH_USER_TOKEN_SIGNATURE as string;
      break;
  }

  return signatures;
};

export const createLoginCredentials = async (user: HUserDocument) => {
  const signatureLevel = await detectSignatureLevel(user.role);
  const signatures = await getSignatures(signatureLevel);
  const jwtid = uuid();
  const accessToken = await generateToken({
    payload: { _id: user._id },
    secret: signatures.access_signature,
    options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN), jwtid },
  });

  const refreshToken = await generateToken({
    payload: { _id: user._id },
    secret: signatures.refresh_signature,
    options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN), jwtid },
  });

  return { accessToken, refreshToken };
};

export const decodedToken = async ({
  authorization,
  tokenType = TokenEnum.access,
}: {
  authorization: string;
  tokenType?: TokenEnum;
}) => {
  const userModel = new UserRepository(UserModel);
  const tokenModel = new TokenRepository(TokenModel);
  const [bearerKey, token] = authorization.split(" ");
  if (!bearerKey || !token) {
    throw new UnAuthorizedException("missing token parts");
  }

  const signatures = await getSignatures(bearerKey as SignatureLevelEnum);
  const decoded = await verifyToken({
    token,
    secret:
      tokenType === TokenEnum.refresh
        ? signatures.refresh_signature
        : signatures.access_signature,
  });

  if (!decoded?._id || !decoded?.iat) {
    throw new BadRequestException("InValid token payload");
  }

  if (await tokenModel.findOne({ filter: { jti: decoded.jti } })) {
    throw new UnAuthorizedException("Invalid or old login credentials");
  }

  const user = await userModel.findOne({ filter: { _id: decoded._id } });
  if (!user) {
    throw new BadRequestException("not registered account");
  }

  if (user?.changeCredentialsTime?.getTime() || 0 > decoded.iat * 1000) {
    throw new UnAuthorizedException("Invalid or old login credentials");
  }
  return { user, decoded };
};

export const createRevokeToken = async (
  decoded: JwtPayload
): Promise<HTokenDocument> => {
  const tokenModel = new TokenRepository(TokenModel);

  const [result] =
    (await tokenModel.create({
      data: [
        {
          jti: decoded.jti as string,
          userId: decoded._id,
          expiresIn:
            (decoded.iat as number) +
            Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
        },
      ],
    })) || [];

  if (!result) {
    throw new BadRequestException("fail to revoke this token ");
  }

  return result;
};
