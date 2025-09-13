"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../DB/models/user.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_events_1 = require("../../utils/events/email.events");
const otp_1 = require("../../utils/otp");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
const success_response_1 = require("../../utils/response/success.response");
class authenticationService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    constructor() { }
    async verifyGmailAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException("failed to verify this google account");
        }
        return payload;
    }
    loginWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: user_model_1.providerEnum.GOOGLE,
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("not registered account or registered with another account");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, family_name, given_name, picture } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
            },
        });
        if (user) {
            if (user.provider === user_model_1.providerEnum.GOOGLE) {
                return await this.loginWithGmail(req, res);
            }
            throw new error_response_1.ConflictException("Email exist with another provider");
        }
        const [newUser] = (await this.userModel.create({
            data: [
                {
                    email: email,
                    firstName: given_name,
                    lastName: family_name,
                    profileImage: picture,
                    confirmedAt: new Date(),
                    provider: user_model_1.providerEnum.GOOGLE,
                },
            ],
        })) || [];
        if (!newUser) {
            throw new error_response_1.BadRequestException("Fail to signup with gmail , please Try again later 😢");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(newUser);
        return (0, success_response_1.successResponse)({ res, statusCode: 201, data: { credentials } });
    };
    signup = async (req, res) => {
        let { firstName, lastName, email, password } = req.body;
        const checkUserExists = await this.userModel.findOne({
            filter: { email },
            select: "email",
            options: {
                lean: false,
            },
        });
        if (checkUserExists) {
            throw new error_response_1.ConflictException("Email Already Exists");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        console.log(otp);
        await this.userModel.createUser({
            data: [
                {
                    firstName,
                    lastName,
                    email,
                    password,
                    confirmEmailOtp: String(otp),
                },
            ],
        });
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                confirmedAt: { $exists: false },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid Account ");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp))) {
            throw new error_response_1.ConflictException("InValid confirmation code");
        }
        await this.userModel.updateOne({
            filter: { email },
            update: {
                confirmedAt: new Date(),
                $unset: { confirmEmailOtp: true },
            },
        });
        return (0, success_response_1.successResponse)({ res });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await this.userModel.findOne({
            filter: { email, provider: user_model_1.providerEnum.SYSTEM },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-Valid Login data");
        }
        if (!user.confirmedAt) {
            throw new error_response_1.BadRequestException("verify your account first , please😊");
        }
        if (!(await (0, hash_security_1.compareHash)(password, user.password))) {
            throw new error_response_1.NotFoundException("In-Valid Login data");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    sendForgotCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: user_model_1.providerEnum.SYSTEM,
                confirmedAt: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-Valid account");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                resetPasswordOtp: await (0, hash_security_1.generateHash)(String(otp)),
            },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("failed to send the reset code ,please try again later😢");
        }
        email_events_1.emailEvent.emit("resetPassword", { to: email, html: String(otp) });
        return (0, success_response_1.successResponse)({ res });
    };
    verifySendForgotCode = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: user_model_1.providerEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-Valid account");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("In-Valid otp");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    resetForgotPassword = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: user_model_1.providerEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-Valid account");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("In-Valid otp");
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                changeCredentialsTime: new Date(),
                $unset: { resetPasswordOtp: true },
            },
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("failed to reset password ,please try again later😢");
        }
        return (0, success_response_1.successResponse)({ res });
    };
}
exports.default = new authenticationService();
