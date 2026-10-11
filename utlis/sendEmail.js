const nodemailer = require("nodemailer");

// Primary Transporter: Gmail SMTP using App Password
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

// Fallback Transporter: Brevo API if configured
async function sendViaBrevo(toEmail, subject, html) {
    if (!process.env.BREVO_API_KEY) {
        throw new Error("BREVO_API_KEY not configured");
    }
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
            sender: { name: "StayHub", email: process.env.EMAIL_USER || "noreply@stayhub.com" },
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

/**
 * Universal email dispatcher with automatic fallback
 */
async function sendMailWithFallback({ to, subject, html }) {
    try {
        await transporter.sendMail({
            from: `"StayHub" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return { success: true, provider: "gmail" };
    } catch (smtpErr) {
        console.warn("Gmail SMTP delivery failed, attempting Brevo fallback:", smtpErr.message);
        try {
            await sendViaBrevo(to, subject, html);
            return { success: true, provider: "brevo" };
        } catch (brevoErr) {
            console.error("All email delivery providers failed:", brevoErr.message);
            throw new Error(`Failed to send email: ${smtpErr.message}`);
        }
    }
}

/**
 * Send OTP verification email for manual signups
 */
async function sendSignupOtpEmail(toEmail, otp, username = "Traveler") {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 36px 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .logo { display: inline-block; font-size: 26px; font-weight: 800; color: #fe424d; text-decoration: none; margin-bottom: 24px; letter-spacing: -0.5px; }
            .logo span { color: #0f172a; }
            h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
            p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
            .otp-box { background: #fff1f2; border: 2px dashed #fda4af; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #fe424d; margin: 0; font-family: monospace; }
            .otp-note { font-size: 13px; color: #e11d48; margin-top: 8px; font-weight: 600; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 18px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">Stay<span>Hub</span></div>
            <h1>Verify your email address</h1>
            <p>Hi <b>${username}</b>,</p>
            <p>Thank you for signing up with StayHub! Use the 6-digit verification code below to verify your account and complete registration:</p>
            
            <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="otp-note"><i class="fa-solid fa-clock"></i> Code expires in 10 minutes</div>
            </div>

            <p>If you did not request this verification code, please ignore this email. Someone may have entered your email address by mistake.</p>

            <div class="footer">
                &copy; ${new Date().getFullYear()} StayHub Inc. All rights reserved.<br>
                Secure Authentication &bull; Extraordinary stays and experiences.
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendMailWithFallback({
        to: toEmail,
        subject: `${otp} is your StayHub verification code`,
        html,
    });
}

/**
 * Send password reset code
 */
async function sendResetPasswordEmail(toEmail, otp) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 36px 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .logo { font-size: 26px; font-weight: 800; color: #fe424d; text-decoration: none; margin-bottom: 24px; display: inline-block; }
            .logo span { color: #0f172a; }
            h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
            p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
            .otp-box { background: #fff1f2; border: 2px dashed #fda4af; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #fe424d; margin: 0; font-family: monospace; }
            .otp-note { font-size: 13px; color: #e11d48; margin-top: 8px; font-weight: 600; }
            .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 18px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">Stay<span>Hub</span></div>
            <h1>Password Reset Request</h1>
            <p>We received a request to reset your password. Use the verification code below to proceed:</p>
            
            <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="otp-note">Code expires in 10 minutes</div>
            </div>

            <p>If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>

            <div class="footer">
                &copy; ${new Date().getFullYear()} StayHub Inc. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendMailWithFallback({
        to: toEmail,
        subject: `${otp} is your StayHub password reset code`,
        html,
    });
}

module.exports = {
    sendSignupOtpEmail,
    sendResetPasswordEmail,
};
