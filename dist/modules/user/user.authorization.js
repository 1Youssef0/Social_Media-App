"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endPoint = void 0;
const user_model_1 = require("../../DB/models/user.model");
exports.endPoint = {
    profile: [user_model_1.roleEnum.user],
    welcome: [user_model_1.roleEnum.user, user_model_1.roleEnum.admin],
    restoreAccount: [user_model_1.roleEnum.admin],
    hardDeleteAccount: [user_model_1.roleEnum.admin],
    dashboard: [user_model_1.roleEnum.admin, user_model_1.roleEnum.superAdmin]
};
