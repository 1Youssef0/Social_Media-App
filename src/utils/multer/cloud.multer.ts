import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import { BadRequestException } from "../response/error.response";
import os from "node:os"
import { v4 as uuid } from "uuid";
export enum storageEnum {
  memory = "memory",
  disk = "disk",
}

export const fileValidation = {
  image: ["image/png", "image/jpeg", "image/gif"],
};

export const cloudFileUpload = ({
  validation = [],
  storageApproach = storageEnum.memory,
  maxSizeMB = 2
}: {
  validation?: string[];
  storageApproach?: storageEnum;
  maxSizeMB?:Number; 
}): multer.Multer => {
  const storage =
    storageApproach === storageEnum.memory
      ? multer.memoryStorage()
      : multer.diskStorage({
        destination:os.tmpdir(),
        filename:function(req:Request , file:Express.Multer.File , callback){
            callback(null,`${uuid()}_${file.originalname}`)
        }
      });

  function fileFilter(
    req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ) {
    if (!validation.includes(file.mimetype)) {
        return callback(
        new BadRequestException("validation error", {
          validationError: [
            {
              key: "file",
              issues: [{ path: "file", message: "Invalid file format" }],
            },
          ],
        })
      );
    }
    return callback(null,true)
  }

  return multer({fileFilter , limits:{fileSize:maxSizeMB * 1024 * 1024}, storage });
};
