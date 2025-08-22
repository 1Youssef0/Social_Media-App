"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandling = exports.NotFoundException = exports.BadRequestException = exports.ApplicationError = void 0;
class ApplicationError extends Error {
    statusCode;
    constructor(message, statusCode = 400, cause) {
        super(message, { cause });
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApplicationError = ApplicationError;
class BadRequestException extends ApplicationError {
    constructor(message, cause) {
        super(message, 400, { cause });
    }
}
exports.BadRequestException = BadRequestException;
class NotFoundException extends ApplicationError {
    constructor(message, cause) {
        super(message, 404, { cause });
    }
}
exports.NotFoundException = NotFoundException;
const globalErrorHandling = (error, req, res, next) => {
    return res.status(error.statusCode || 500).json({
        err_message: error.message || "something went wrong❌",
        stack: process.env.MODE === "development" ? error.stack : undefined,
        error,
        cause: error.cause,
    });
};
exports.globalErrorHandling = globalErrorHandling;
