"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../DB/models/user.model");
const error_response_1 = require("../../utils/response/error.response");
class authenticationService {
    constructor() { }
    signup = async (req, res) => {
        let { userName, email, password } = req.body;
        console.log({ userName, email, password });
        const checkUserExists = await user_model_1.userModel.findOne({ email });
        if (checkUserExists) {
            throw new error_response_1.BadRequestException("Email Exists");
        }
        const user = await user_model_1.userModel.create(req.body);
        return res.status(201).json({ message: "signed-up successfully", data: user });
    };
    login = (req, res) => {
        return res.status(201).json({ message: "logged successfully", data: req.body });
    };
}
exports.default = new authenticationService();
