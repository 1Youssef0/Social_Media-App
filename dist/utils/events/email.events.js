"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEvent = void 0;
const node_events_1 = require("node:events");
const send_email_1 = require("../email/send.email");
exports.emailEvent = new node_events_1.EventEmitter();
exports.emailEvent.on("confirmEmail", async (data) => {
    try {
        data.subject = "confirm-email";
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log("failed to send Email", error);
    }
});
exports.emailEvent.on("resetPassword", async (data) => {
    try {
        data.subject = "reset-password";
        await (0, send_email_1.sendEmail)(data);
    }
    catch (error) {
        console.log("failed to send Email", error);
    }
});
