"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetForgotPassword = exports.verifySendForgotCode = exports.sendForgotCode = exports.signupWithGmail = exports.confirmEmail = exports.login = exports.signup = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.signup = {
    body: zod_1.z
        .object({
        firstName: validation_middleware_1.generalFields.firstName,
        lastName: validation_middleware_1.generalFields.lastName,
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
    })
        .superRefine((data, ctx) => {
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirm Password"],
                message: "password mismatch confirmPassword",
            });
        }
    }),
};
exports.login = {
    body: zod_1.z.object({
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
    }),
};
exports.confirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        otp: validation_middleware_1.generalFields.otp,
    }),
};
exports.signupWithGmail = {
    body: zod_1.z.strictObject({
        idToken: zod_1.z.string(),
    }),
};
exports.sendForgotCode = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
    }),
};
exports.verifySendForgotCode = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        otp: validation_middleware_1.generalFields.otp,
    }),
};
exports.resetForgotPassword = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
        otp: validation_middleware_1.generalFields.otp,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword
    }).refine((data) => {
        return data.password === data.confirmPassword;
    }, {
        message: "password mismatch with confirm-password",
        path: ["confirm-password"]
    }),
};
