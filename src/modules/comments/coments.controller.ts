import { Router } from "express";
import { authentication } from "../../middleware/authentication.middleware";
import {
  cloudFileUpload,
  fileValidation,
} from "../../utils/multer/cloud.multer";
import commentsService from "./comments.service";
import * as validators from "./comments.validation"
import { validation } from "../../middleware/validation.middleware";

const router = Router({mergeParams:true});


router.post(
  "/",
  authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.createComment),
  commentsService.createComment
);


router.post(
  "/:commentId/reply",
  authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.replyOnComment),
  commentsService.replyOnComment
);


export default router