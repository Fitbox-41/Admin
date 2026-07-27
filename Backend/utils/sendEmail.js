import { Resend } from 'resend';

const sendEmail = async (options) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: options.from || process.env.EMAIL_FROM || 'FitBox Sports <security@fitboxsports.in>',
      to: options.email,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || undefined,
    });

    if (error) {
      console.error('Resend error: ', error);
      return false;
    }

    console.log('Message sent via Resend: %s', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending email: ', error);
    return false;
  }
};

export default sendEmail;
