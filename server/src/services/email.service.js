const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendWelcome(email) {
  await transporter.sendMail({
    from: `Magazine <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Magazine',
    html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
  });
}

async function sendSubscription(email, plan) {
  await transporter.sendMail({
    from: `Magazine <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Subscription activated: ${plan}`,
    html: `<p>Your ${plan} plan is now active.</p>`,
  });
}


module.exports = { sendWelcome, sendSubscription };
