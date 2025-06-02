const nodemailer = require('nodemailer');

const sendConfirmationEmail = async (email, name, orderId, itemsHtml) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: '"Parthiv’s Restaurant" <your-email@example.com>',
    to: email,
    subject: `🧾 Order Confirmation - Thank You, ${name}!`,
    html: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>We’ve received your order!</p>
      ${itemsHtml}
      <br/>
     
    `
  });
};

module.exports = sendConfirmationEmail;