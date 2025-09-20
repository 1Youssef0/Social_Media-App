import { Router } from "express";
import userService from "./user.service";
import { authentication, authorization } from "../../middleware/authentication.middleware";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./user.validation";
import { TokenEnum } from "../../utils/security/token.security";
import { cloudFileUpload, fileValidation, storageEnum } from "../../utils/multer/cloud.multer";
import { endPoint } from "./user.authorization";

const router = Router()

router.get("/",authentication(),userService.profile)
router.get("/dashboard",authorization(endPoint.dashboard),userService.dashboard)
router.post("/userId/send-friend-request",authentication(),validation(validators.sendFriendRequest),userService.sendFriendRequest)
router.patch("/accept-friend-request/:requestId",authentication(),validation(validators.acceptFriendRequest),userService.acceptFriendRequest)
router.patch("/:userId/change-role",authorization(endPoint.dashboard),validation(validators.changeRole),userService.changeRole)
router.patch("/profile-image",authentication(),cloudFileUpload({validation:fileValidation.image,storageApproach:storageEnum.disk}).single("image"),userService.profileImage)
router.patch("/profile-cover-image",authentication(),cloudFileUpload({validation:fileValidation.image,storageApproach:storageEnum.disk}).array("images",2),userService.profileCoverImage)
router.patch("/profile-image-pre",authentication(),userService.preSignedUpUrl)
router.post("/logout",authentication(),validation(validators.logout),userService.logout)
router.post("/refresh-token",authentication(TokenEnum.refresh),userService.refreshToken)
router.delete("{/:userId}/freeze-account",authentication(),validation(validators.freezeAccount),userService.freezeAccount)
router.delete("/:userId/hard-delete-account",authorization(endPoint.hardDeleteAccount),validation(validators.hardDeleteAccount),userService.hardDeleteAccount)
router.patch("/:userId/restore-account",authorization(endPoint.restoreAccount),validation(validators.restoreAccount),userService.restoreAccount)

export default router