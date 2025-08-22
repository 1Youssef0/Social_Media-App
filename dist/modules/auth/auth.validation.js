"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.signup = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.signup = {
    body: zod_1.z.object({
        userName: validation_middleware_1.generalFields.userName,
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword
    }).superRefine((data, ctx) => {
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirm Password"],
                message: "password mismatch confirmPassword"
            });
        }
        if (data.userName?.split(" ")?.length != 2) {
            ctx.addIssue({
                code: "custom",
                path: ["user Name"],
                message: "userName must consists of 2 parts ,ex:JOHN DOE"
            });
        }
    })
};
exports.login = {
    body: zod_1.z.object({
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword
    }).superRefine((data, ctx) => {
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirm Password"],
                message: "password mismatch confirmPassword"
            });
        }
    })
};
