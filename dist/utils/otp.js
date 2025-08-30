"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNumberOtp = void 0;
const generateNumberOtp = () => {
    return Math.floor(Math.random() * 1000000);
};
exports.generateNumberOtp = generateNumberOtp;
