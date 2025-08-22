"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    userName: {
        type: String,
        minLength: 2,
        maxLength: 20,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        minLength: 8,
        maxLength: 25,
    },
}, {
    timestamps: true
});
exports.userModel = mongoose_1.default.models.user || mongoose_1.default.model("user", userSchema);
exports.userModel.syncIndexes();
