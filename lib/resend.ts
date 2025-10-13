import { JSXElementConstructor, ReactElement } from "react";
import { render, toPlainText } from "@react-email/render";
import nodemailer from "nodemailer";
import { log, nanoid } from "@/lib/utils";

/**
 * SMTP configuration for Docker Mailserver.
 * Set environment variables in your container or `.env`:
 *
 * MAIL_HOST=smtp.mail.local
 * MAIL_PORT=587
 * MAIL_USER=system@papermark.io
 * MAIL_PASS=yourpassword
 */
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "mail",
  port: Number(process.env.MAIL_PORT) || 465,
  secure: true, // use STARTTLS
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  react,
  from,
  marketing,
  system,
  verify,
  test,
  cc,
  replyTo,
  scheduledAt,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  from?: string;
  marketing?: boolean;
  system?: boolean;
  verify?: boolean;
  test?: boolean;
  cc?: string | string[];
  replyTo?: string;
  scheduledAt?: string;
  unsubscribeUrl?: string;
}) => {
  const html = await render(react);
  const plainText = toPlainText(html);

  const fromAddress = process.env.FROM_SYSTEM_EMAIL
    // from ??
    // (marketing
    //   ? "Marc from Papermark <marc@ship.papermark.io>"
    //   : system
    //     ? "Papermark <system@papermark.io>"
    //     : verify
    //       ? "Papermark <system@verify.papermark.io>"
    //       : !!scheduledAt
    //         ? "Marc Seitz <marc@papermark.io>"
    //         : "Marc from Papermark <marc@papermark.io>");

  try {
    if(test)
      return;

    // Test emails go to a dummy address
    const recipient = to;

    const message = {
      from: fromAddress,
      to: recipient,
      cc,
      replyTo: replyTo,
      subject,
      html,
      text: plainText,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
        ...(unsubscribeUrl ? { "List-Unsubscribe": unsubscribeUrl } : {}),
      },
    };

    // Handle scheduled sending (queue or delay)
    if (scheduledAt) {
      const delay = new Date(scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        log({
          message: `Delaying email for ${delay / 1000}s (scheduled for ${scheduledAt})`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    const info = await transporter.sendMail(message);

    log({
      message: `Email sent successfully: ${info.messageId}`,
      type: "info",
    });

    return info;
  } catch (error) {
    log({
      message: `Error sending email via Mailserver: ${error}`,
      type: "error",
      mention: true,
    });
    throw error;
  }
};