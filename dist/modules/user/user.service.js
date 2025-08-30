"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_security_1 = require("../../utils/security/token.security");
const user_model_1 = require("../../DB/models/user.model");
const user_repository_1 = require("../../DB/repository/user.repository");
class UserService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    constructor() { }
    profile = async (req, res) => {
        return res.json({
            message: "done",
            data: {
                user: req.user,
                decoded: req.decoded,
            },
        });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        const update = {};
        switch (flag) {
            case token_security_1.logoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
                break;
        }
        await this.userModel.updateOne({
            filter: { _id: req.decoded?._id },
            update,
        });
        return res.json({
            message: "logged out successfully",
        });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return res.status(201).json({ message: "Done", data: { credentials } });
    };
}
exports.default = new UserService();
