import { z } from "zod";
import { logoutEnum } from "../../utils/security/token.security";
import { Types } from "mongoose";
import { generalFields } from "../../middleware/validation.middleware";
import { roleEnum } from "../../DB/models/user.model";

export const logout = {
  body: z.strictObject({
    flag: z.enum(logoutEnum).default(logoutEnum.only),
  }),
};

export const changeRole = {
  params: z.strictObject({
    userId: generalFields.id,
  }),
  body: z.strictObject({
    role: z.enum(roleEnum),
  }),
};

export const sendFriendRequest = {
  params: z.strictObject({
    userId: generalFields.id,
  }),
};

export const acceptFriendRequest = {
  params: z.strictObject({
    requestId: generalFields.id,
  }),
};

export const freezeAccount = {
  params: z
    .object({
      userId: z.string().optional(),
    })
    .optional()
    .refine(
      (data) => {
        return data?.userId ? Types.ObjectId.isValid(data.userId) : true;
      },
      {
        error: "In valid objectId format",
        path: ["userId"],
      }
    ),
};

export const restoreAccount = {
  params: z
    .object({
      userId: z.string(),
    })
    .refine(
      (data) => {
        return Types.ObjectId.isValid(data.userId);
      },
      {
        error: "In valid objectId format",
        path: ["userId"],
      }
    ),
};

export const welcome = z.strictObject({
  name: z.string().min(2),
});

export const hardDeleteAccount = restoreAccount;
