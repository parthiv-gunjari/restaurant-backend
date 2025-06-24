const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOrderCompletionEmail(to, order) {
  const orderCode = order.orderCode || order._id || 'Unknown';

  const mailOptions = {
    from: `"Parthiv's Kitchen" <${process.env.EMAIL_USER}>`,
    to,
    subject: `✅ Order #${orderCode} Ready for Pickup!`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
        <h2 style="color: #27ae60;">Parthiv's Kitchen</h2>
        <p style="font-size: 16px;">Hi <strong>Foodie</strong>,</p>
        <p style="font-size: 15px;">
          We're happy to inform you that your order 
          <strong style="color: #2c3e50;">#${orderCode}</strong> is now 
          <span style="color:green;"><strong>ready for pickup</strong></span>! 🎉
        </p>
        <p style="font-size: 15px;">Please visit our counter to collect your food.</p>
        <p style="font-size: 15px;">We hope you enjoy your meal!</p>
        <hr style="margin: 20px 0;" />
        <p style="font-size: 14px; color: #888;">– Team Parthiv’s Kitchen</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendOrderCompletionEmail;