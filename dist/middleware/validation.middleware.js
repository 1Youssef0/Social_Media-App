"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalFields = exports.graphValidation = exports.validation = void 0;
const error_response_1 = require("../utils/response/error.response");
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const graphql_1 = require("graphql");
const validation = (schema) => {
    return (req, res, next) => {
        const validationErrors = [];
        for (const key of Object.keys(schema)) {
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
                const errors = validationResult.error;
                validationErrors.push({
                    key,
                    issues: errors.issues.map((issue) => {
                        return { message: issue.message, path: issue.path };
                    }),
                });
            }
        }
        if (validationErrors.length) {
            throw new error_response_1.BadRequestException("Validation Error", { validationErrors });
        }
        return next();
    };
};
exports.validation = validation;
const graphValidation = async (schema, args) => {
    const validationResult = await schema.safeParseAsync(args);
    if (!validationResult.success) {
        const errors = validationResult.error;
        throw new graphql_1.GraphQLError("validation Error", {
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
exports.graphValidation = graphValidation;
exports.generalFields = {
    firstName: zod_1.z.string().min(2).max(20),
    lastName: zod_1.z.string().min(2).max(20),
    email: zod_1.z.email(),
    otp: zod_1.z.string().regex(/^\d{6}$/),
    password: zod_1.z
        .string()
        .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-z])(?=.*[a-zA-Z]).{8,}$/),
    confirmPassword: zod_1.z.string(),
    file: function (mimetype) {
        return zod_1.z
            .strictObject({
            fieldname: zod_1.z.string(),
            originalname: zod_1.z.string(),
            encoding: zod_1.z.string(),
            mimetype: zod_1.z.enum(mimetype),
            buffer: zod_1.z.any().optional(),
            path: zod_1.z.string().optional(),
            size: zod_1.z.number(),
        })
            .refine((data) => {
            return data.buffer || data.path;
        }, {
            error: "neither path or buffer is available",
            path: ["file"],
        });
    },
    id: zod_1.z.string().refine((data) => {
        return mongoose_1.Types.ObjectId.isValid(data);
    }, { error: "In-Valid ObjectId format" }),
};
