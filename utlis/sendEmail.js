// const nodemailer = require("nodemailer");

// // Uses a free Gmail account + "App Password" (not your normal Gmail password).
// // Set these in your .env file:
// //   EMAIL_USER = youraddress@gmail.com
// //   EMAIL_PASS = your 16-character Gmail App Password (NO spaces)
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//     },
//     connectionTimeout: 10000,
//     greetingTimeout: 10000,
//     socketTimeout: 10000,
// });

// module.exports.sendVerificationEmail = async (toEmail, otp) => {
//     await transporter.sendMail({
//         from: `"StayHub" <${process.env.EMAIL_USER}>`,
//         to: toEmail,
//         subject: "Your StayHub verification code",
//         html: `
//             <h2>Welcome to StayHub!</h2>
//             <p>Enter this code on the website to verify your email:</p>
//             <h1 style="letter-spacing: 0.5rem; color:#fe424d;">${otp}</h1>
//             <p>This code expires in 10 minutes.</p>
//         `,
//     });
// };

// module.exports.sendResetPasswordEmail = async (toEmail, otp) => {
//     await transporter.sendMail({
//         from: `"StayHub" <${process.env.EMAIL_USER}>`,
//         to: toEmail,
//         subject: "Your StayHub password reset code",
//         html: `
//             <h2>Password Reset Request</h2>
//             <p>Enter this code on the website to reset your password:</p>
//             <h1 style="letter-spacing: 0.5rem; color:#fe424d;">${otp}</h1>
//             <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
//         `,
//     });
// };



async function sendViaBrevo(toEmail, subject, html) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
            sender: { name: "StayHub", email: process.env.EMAIL_USER },
            to: [{ email: toEmail }],
            subject,
            htmlContent: html,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
    }
}

module.exports.sendVerificationEmail = async (toEmail, otp) => {
    await sendViaBrevo(
        toEmail,
        "Your StayHub verification code",
        `
            <h2>Welcome to StayHub!</h2>
            <p>Enter this code on the website to verify your email:</p>
            <h1 style="letter-spacing: 0.5rem; color:#fe424d;">${otp}</h1>
            <p>This code expires in 10 minutes.</p>
        `
    );
};

module.exports.sendResetPasswordEmail = async (toEmail, otp) => {
    await sendViaBrevo(
        toEmail,
        "Your StayHub password reset code",
        `
            <h2>Password Reset Request</h2>
            <p>Enter this code on the website to reset your password:</p>
            <h1 style="letter-spacing: 0.5rem; color:#fe424d;">${otp}</h1>
            <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
        `
    );
};