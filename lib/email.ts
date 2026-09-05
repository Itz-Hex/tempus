import nodemailer from "nodemailer";

export function sendEmail(toName: string, toEmail: string, subject: string, text: string) {
    let transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST as string,
        port: process.env.SMTP_PORT as string,
        auth: {
            user: process.env.SMTP_USER as string,
            pass: process.env.SMTP_PASS as string,
        }
    });

    transport.sendMail({
        from: "Tempus <accounts@tempus.app>",
        to: `${toName} <${toEmail}>`,
        subject: subject,
        text: text,
    }, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log("Message sent:", info.messageId);
    });
}