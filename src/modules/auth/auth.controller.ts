import { Router } from "express";
import authenticationService from "./auth.service";
import * as validators from "./auth.validation"
import { validation } from "../../middleware/validation.middleware";

const router: Router = Router();

router.post("/signup",validation(validators.signup) ,authenticationService.signup )
router.post("/signup-gmail",validation(validators.signupWithGmail) ,authenticationService.signupWithGmail )
router.post("/login-gmail",validation(validators.signupWithGmail) ,authenticationService.loginWithGmail )
router.patch("/confirm-email",validation(validators.confirmEmail) ,authenticationService.confirmEmail )
router.post("/login",validation(validators.login), authenticationService.login )
router.patch("/send-password",validation(validators.sendForgotCode), authenticationService.sendForgotCode)
router.patch("/verify-send-password",validation(validators.verifySendForgotCode), authenticationService.verifySendForgotCode)
router.patch("/reset-forget-password",validation(validators.resetForgotPassword), authenticationService.resetForgotPassword)



export default router