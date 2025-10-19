import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'

const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS,
    }
})

export async function sendVerificationEmail(email, userId, url=null,subject='Verify your Email',html=null) {
     const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
       expiresIn: "1h",
     });

    const verificationUrl =
         url || `http://localhost:3000/verify?token=${token}`;

  const emailHtml =
    html ||
    `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`;

      await transporter.sendMail({
        to: email,
        subject,
        html: emailHtml,
      });


}

export async function sendSuspiciousLoginEmail(
  email,
  ip,
  device,
  city,
  country
) {
  await transporter.sendMail({
    to: email,
    subject: "Suspicious Login Detected",
    html: `<p>New login detected:<br>IP: ${ip}<br>Device: ${device}<br>Location: ${city}, ${country}</p>`,
  });
}