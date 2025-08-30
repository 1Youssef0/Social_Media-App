import { EventEmitter } from "node:events";
import Mail from "nodemailer/lib/mailer";
import { sendEmail } from "../email/send.email";

export const emailEvent = new EventEmitter();

emailEvent.on("confirmEmail", async (data: Mail.Options) => {
  try {
    data.subject = "confirm-email";
    await sendEmail(data);
  } catch (error) {
    console.log("failed to send Email", error);
  }
});


emailEvent.on("resetPassword", async (data: Mail.Options) => {
  try {
    data.subject = "reset-password";
    await sendEmail(data);
  } catch (error) {
    console.log("failed to send Email", error);
  }
});
