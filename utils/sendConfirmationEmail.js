const nodemailer = require('nodemailer');

const sendConfirmationEmail = async (email, name, orderId, itemsHtml) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    console.log("📧 Sending confirmation email to:", email);

    await transporter.sendMail({
      from: `"Parthiv’s Restaurant" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🧾 Order Confirmation - Thank You, ${name}!`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We’ve received your order!</p>
          ${itemsHtml || '<p>No order details available.</p>'}
          <p style="margin-top: 20px;">We’ll notify you once it’s ready for pickup.</p>
          <p>– Team Parthiv’s Kitchen</p>
        </div>
      `
    });

    console.log("✅ Confirmation email sent to:", email);
  } catch (error) {
    console.error("❌ Failed to send confirmation email:", error.message || error);
    throw error;
  }
};

module.exports = sendConfirmationEmail;