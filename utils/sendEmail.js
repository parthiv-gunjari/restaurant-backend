const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOrderCompletionEmail(to, orderId) {
  const mailOptions = {
    from: `"Parthiv's Kitchen" <${process.env.EMAIL_USER}>`,
    to,
    subject: `✅ Order #${orderId} Ready for Pickup!`,
    html: `
      <p>Hi there,</p>
      <p>Your order <strong>#${orderId}</strong> is now <span style="color:green;"><strong>ready for pickup</strong></span>! 🎉</p>
      <p>Please visit our counter to collect your food.</p>
      <p>We hope you enjoy your meal!</p>
      <br/>
      <p>– Team Parthiv’s Kitchen</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendOrderCompletionEmail;