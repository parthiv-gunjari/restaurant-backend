require('dotenv').config();
const nodemailer = require('nodemailer');

const sendConfirmationEmail = async ({ email, name, orderCode, items, transactionId, timestamp, cardBrand, last4, form }) => {
  try {
    if (!email) throw new Error('Recipient email is missing.');

    console.log("🔍 EMAIL_USERNAME:", process.env.EMAIL_USERNAME);
    console.log("🔍 EMAIL_PASSWORD exists:", !!process.env.EMAIL_PASSWORD);
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

    const itemsList = `
  <div style="border-radius: 8px; padding: 10px; background-color: #fafafa;">
    <table style="width: 100%; font-family: Arial, sans-serif; border-collapse: collapse;">
      <thead>
        <tr style="text-align: left; border-bottom: 2px solid #e0e0e0;">
          <th style="padding: 10px 5px;">Item</th>
          <th style="padding: 10px 5px; text-align: center;">Qty</th>
          <th style="padding: 10px 5px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr style="border-bottom: 1px dashed #ddd;">
            <td style="padding: 8px 5px;">${item.name}</td>
            <td style="padding: 8px 5px; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px 5px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr style="font-weight: bold;">
          <td style="padding: 10px 5px;">Total</td>
          <td></td>
          <td style="padding: 10px 5px; text-align: right;">$${totalAmount}</td>
        </tr>
      </tbody>
    </table>
  </div>
`;

    const mailOptions = {
      from: `Parthiv's Kitchen <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Order Confirmation - ${orderCode}`,
      html: `
  <div style="max-width: 650px; margin: auto; padding: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fffdf7; color: #333; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="margin: 0; color: #e67e22;">Parthiv's Kitchen</h1>
      <p style="margin: 5px 0 0; font-size: 14px; color: #777;">1216 Avenue A, Denton, TX 76201</p>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

    <h2 style="font-size: 20px; margin-bottom: 10px;">Order Confirmation</h2>
    <p style="line-height: 1.6;">
      <strong>Order ID:</strong> ${orderCode}<br/>
      <strong>Name:</strong> ${name}<br/>
      <strong>Email:</strong> <a href="mailto:${email}" style="color: #3498db;">${email}</a><br/>
      <strong>Date:</strong> ${new Date(timestamp).toLocaleString()}<br/>
      <strong>Payment:</strong> ${cardBrand.toUpperCase()} ending in ${last4}<br/>
      <strong>Transaction ID:</strong> ${transactionId}
    </p>

    ${itemsList}

    ${form?.notes ? `
    <div style="margin-top: 20px;">
      <strong>Special Instructions:</strong>
      <p style="margin: 5px 0 0; padding: 10px; background-color: #fff0d6; border-radius: 4px;">${form.notes}</p>
    </div>` : ''}

    <div style="margin-top: 30px; font-size: 15px; line-height: 1.6;">
      <p>Thank you for choosing <strong>Parthiv's Kitchen</strong>! 🍽️</p>
      <p>Your food is being prepared with love and care.<br/>We look forward to serving you again!</p>
    </div>

    <p style="text-align: center; font-size: 12px; margin-top: 30px; color: #aaa;">&copy; ${new Date().getFullYear()} Parthiv's Kitchen. All rights reserved.</p>
  </div>
`
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Confirmation email sent to: ${email}`);
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error.message);
  }
};

module.exports = sendConfirmationEmail;