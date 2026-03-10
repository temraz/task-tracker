import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendInvitationEmail = async (email, name, invitationToken) => {
  const invitationLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
  
  const mailOptions = {
    from: `"Classera Task Tracker" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Invitation to Classera Task Tracker',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1B2A4A; color: #C9A84C; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #1B2A4A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Classera Task Tracker</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}!</h2>
            <p>You have been invited to join the Classera Task Tracker platform.</p>
            <p>Click the button below to accept your invitation and set up your account:</p>
            <div style="text-align: center;">
              <a href="${invitationLink}" class="button">Accept Invitation</a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <a href="${invitationLink}">${invitationLink}</a>
            </p>
            <p style="margin-top: 20px; color: #666;">
              This invitation link will expire in 7 days.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Classera. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Classera Task Tracker!
      
      You have been invited to join the platform. Click the link below to accept your invitation:
      
      ${invitationLink}
      
      This invitation link will expire in 7 days.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Invitation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending invitation email:', error);
    return { success: false, error: error.message };
  }
};

export default transporter;
