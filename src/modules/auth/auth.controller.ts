import { Router } from "express";
import authenticationService from "./auth.service";
import * as validators from "./auth.validation"
import { validation } from "../../middleware/validation.middleware";

const router: Router = Router();

router.post("/signup",validation(validators.signup) ,authenticationService.signup )
router.post("/login", authenticationService.login )



export default router