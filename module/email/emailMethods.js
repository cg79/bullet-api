// https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications
// https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens#set-up-our-node-application-(package-json)

const nodemailer = require("nodemailer");

// const config = require("../../config/development");
// const sesTransport = require('nodemailer-ses-transport');

// const smtpSettings = require("./settings");

const smtpSettings = {
  from: "contact@quickconta.ro",
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "contact@quickconta.ro",
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: true,
  },
};

class EmailMethods {
  constructor() {
    this.mainPath = "./templates/";
    this.transporter = null;
  }

  async sendEmail(body) {
    if (!smtpSettings.auth.pass) {
      smtpSettings.auth.pass = process.env.SMTP_PASSWORD || "";
    }
    if (!smtpSettings.auth.pass) {
      throw new Error("Please provide the smtp pass when sending emails");
    }

    if (this.transporter == null) {
      this.transporter = nodemailer.createTransport(smtpSettings);
    }

    if (!body) {
      throw new Error("Please provide the body when sending emails");
    }

    const { from, to, subject, html, bcc } = body;
    if (!to) {
      throw new Error("please provide the to value when sending emails");
    }
    if (!subject) {
      throw new Error("please provide the subject value when sending emails");
    }
    if (!html) {
      throw new Error("please provide the html value when sending emails");
    }

    const emailMessage = {
      from: from || smtpSettings.from,
      to,
      subject,
      html,
      bcc: `${bcc || ""}, claudiu9379@gmail.com`,
    };

    try {
      const mailResponse = await this.transporter.sendMail(
        emailMessage
        // (err, data, res) => {
        //   if (err) {
        //     console.log(err);
        //     throw new Error(err);
        //   }
        //   debugger;
        //   console.log(data);
        //   return { ok: 1 };
        // }
      );
      return { ok: 1 };
    } catch (error) {
      debugger;
      console.log(error.message);
      return {
        ok: 0,
        error: error.message,
      };
    }
  }

  async sendUserCreatedEmail(obj) {
    return this.sendEmail({
      from: "QuickConta 👻 <contact@quickconta.ro>",
      to: obj.to,
      subject: "Contul a fost creat",
      html: `
      <h1>Contul doar ce a fost creat</h1>
      <p>Va multumim! </p>
      `,
    });
  }

  async sendForgotPasswordEmail(to, resetcode) {
    const href = `http://${process.env.HOST}/resetareparola?resetcode=${resetcode}&email=${to}`;
    return this.sendEmail({
      from: "QuickConta 👻 <contact@quickconta.ro>",
      to: to,
      subject: "Setare parola noua",
      html: `
      <h1>Pentru a seta parola noua va rugam apasati pe linkul de mai jos</h1>
      <a href="${href}"> 
      <p>Resetare Parola</p>
      </a>
      <p>Va multumim! </p>
      `,
    });
  }

  async sendInvitationEmail(invitation) {
    const { _id, email, clientId } = invitation;
    const href = `http://${process.env.HOST}/acceptare-invitatie?_id=${_id}&clientId=${clientId}`;
    return this.sendEmail({
      from: "QuickConta 👻 <contact@quickconta.ro>",
      to: email,
      subject: "Invitatie la QuickConta",
      html: `
      <h1>Folosind acest email, poti face contul tau la QuickConta  </h1>
      <a href="${href}"> 
      <p>Acceptare Invitatie</p>
      </a>
      <p>Va multumim! </p>
      `,
    });
  }
}

module.exports = new EmailMethods();
