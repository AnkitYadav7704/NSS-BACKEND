import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOTPEmail = async (email, otp, name = '') => {
  try {
    const mailOptions = {
      from: `"MMMUT NSS Blood Donation Camp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Email Verification - MMMUT NSS Blood Donation Camp',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MMMUT NSS Blood Donation Camp</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Hello ${name},</p>
            <p>Thank you for your interest in joining the MMMUT NSS Blood Donation Camp platform.</p>
            <p>Your verification code is:</p>
            <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from MMMUT NSS Blood Donation Camp.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

export const sendAdminApprovalEmail = async (email, name, approved = true, reason = null) => {
  try {
    const subject = approved ? 'Admin Access Approved' : 'Admin Access Request Rejected';
    
    let message;
    if (approved) {
      message = `Congratulations! Your admin access request has been approved. You can now login with admin privileges using the email and password you provided during the request process.`;
    } else {
      message = `We regret to inform you that your admin access request has been rejected.`;
      if (reason) {
        message += `\n\nReason: ${reason}`;
      }
    }
    
    const mailOptions = {
      from: `"MMMUT NSS Blood Donation Camp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${subject} - MMMUT NSS Blood Donation Camp`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MMMUT NSS Blood Donation Camp</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <h2 style="color: #333;">${subject}</h2>
            <p>Hello ${name},</p>
            <p style="white-space: pre-line;">${message}</p>
            ${approved ? '<p>You can now login at: <a href="' + process.env.FRONTEND_URL + '/login">Login Here</a></p>' : ''}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from MMMUT NSS Blood Donation Camp.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Admin approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};