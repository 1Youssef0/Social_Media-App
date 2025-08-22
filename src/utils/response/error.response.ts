import { NextFunction, Request, Response } from "express";

export interface IError extends Error {
  statusCode: number;
}

export class ApplicationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400 ,
    // options?: ErrorOptions
    cause?:unknown
  ) {
    super(message, {cause});
    this.name = this.constructor.name; // Error Location name
    Error.captureStackTrace(this, this.constructor); //checking tracing code Error
  }
}


export class BadRequestException extends ApplicationError  {
  constructor(
    message: string,
    cause?:unknown
  ) {
    super(message, 400, {cause});
  }
}


export class NotFoundException extends ApplicationError  {
  constructor(
    message: string,
    cause?:unknown
  ) {
    super(message, 404, {cause});
  }
}


export const globalErrorHandling = (
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return res.status(error.statusCode || 500).json({
    err_message: error.message || "something went wrong❌",
    stack: process.env.MODE === "development" ? error.stack : undefined,
    error,
    cause: error.cause,
  });
};
