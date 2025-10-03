"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.providerEnum = exports.roleEnum = exports.genderEnum = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const hash_security_1 = require("../../utils/security/hash.security");
const email_events_1 = require("../../utils/events/email.events");
var genderEnum;
(function (genderEnum) {
    genderEnum["male"] = "male";
    genderEnum["female"] = "female";
})(genderEnum || (exports.genderEnum = genderEnum = {}));
var roleEnum;
(function (roleEnum) {
    roleEnum["user"] = "user";
    roleEnum["admin"] = "admin";
    roleEnum["superAdmin"] = "super-admin";
})(roleEnum || (exports.roleEnum = roleEnum = {}));
var providerEnum;
(function (providerEnum) {
    providerEnum["GOOGLE"] = "GOOGLE";
    providerEnum["SYSTEM"] = "SYSTEM";
})(providerEnum || (exports.providerEnum = providerEnum = {}));
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },
    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmedAt: { type: Date },
    password: {
        type: String,
        required: function () {
            return this.provider === providerEnum.GOOGLE ? false : true;
        },
    },
    resetPasswordOtp: { type: String },
    changeCredentialsTime: { type: Date },
    freezedAt: Date,
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: Date,
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    friends: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    phone: { type: String },
    profileImage: { type: String },
    temProfileImage: { type: String },
    coverImages: [String],
    address: { type: String },
    gender: { type: String, enum: genderEnum, default: genderEnum.male },
    role: { type: String, enum: roleEnum, default: roleEnum.user },
    provider: {
        type: String,
        enum: providerEnum,
        default: providerEnum.SYSTEM,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
userSchema
    .virtual("userName")
    .set(function (value) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName });
})
    .get(function () {
    return this.firstName + " " + this.lastName;
});
userSchema.pre("save", async function (next) {
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
        this.password = await (0, hash_security_1.generateHash)(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
        this.confirmEmailPlainOtp = this.confirmEmailOtp;
        this.confirmEmailOtp = await (0, hash_security_1.generateHash)(this.confirmEmailOtp);
    }
    next();
});
userSchema.post("save", async function (doc, next) {
    const that = this;
    if (that.wasNew && that.confirmEmailPlainOtp) {
        email_events_1.emailEvent.emit("confirmEmail", {
            to: this.email,
            html: that.confirmEmailPlainOtp,
        });
    }
    next();
});
userSchema.pre(["find", "findOne"], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
exports.UserModel = mongoose_1.default.models.user || mongoose_1.default.model("user", userSchema);
