const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");

module.exports = class Email {
  constructor(user, url) {
    this.to = user;
    this.firstName = user.split("@")[0];
    this.url = url;
    this.from = `LogCat Support <${process.env.MAIL_FROM}>`;

    // console.log("first", user, url);
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      // Sendgrid
      return 1;
    }

    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML from a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    console.log("first", mailOptions);

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to LogCat!");
  }

  async sendCrash() {
    await this.send("crash", "Crash Notification: LogCat")
  }

  async forgetPassword() {
    await this.send("forgetPassword", "Password Reset OTP: LogCat")
  }


};
