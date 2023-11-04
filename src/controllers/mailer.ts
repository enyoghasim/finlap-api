import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";

export interface Templates {
  name: string;
  subject: string;
}

class Mailer {
  private sender: string;
  private nodeMailerTransporter: nodemailer.Transporter;

  constructor() {
    // this.ses = new aws.SES({ region: "us-west-2", correctClockSkew: true });
    this.sender = `FINLAP <${process.env.EMAIL_ADDRESS}>`;

    this.nodeMailerTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    this.nodeMailerTransporter.use(
      "compile",
      hbs({
        viewPath: "src/views/emails/templates",
        extName: ".hbs",
        viewEngine: {
          extname: ".hbs",
          layoutsDir: "src/views/emails/",

          defaultLayout: "layout",

          partialsDir: "src/views/emails/partials",
        },
      })
    );
  }

  sendMail = async (mailOptions: nodemailer.SendMailOptions) =>
    new Promise((resolve, reject) => {
      this.nodeMailerTransporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(info);
        return;
      });
    });

  sendTemplatedEmail = async ({
    recipients,
    template,
    templateData,
  }: {
    recipients: Array<string> | string;
    template: Templates;
    templateData: any;
  }): Promise<Boolean> => {
    // const formattedHTML = template.template(templateData);
    // console.log(templateData, "in hererererer");

    let mailOptions: any = {
      from: this.sender,
      to: recipients,
      subject: template.subject,
      template: template.name,
      context: templateData,
    };

    try {
      const isSent = await this.sendMail(mailOptions);
      // console.log("mail sent", isSent);

      return !!isSent;
    } catch (e) {
      console.log(e);
      return false;
    }
  };
}

export default Mailer;
