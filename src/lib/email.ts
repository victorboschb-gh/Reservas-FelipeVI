import nodemailer from 'nodemailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || '';

export async function sendConfirmationEmail(
  to: string,
  name: string,
  token: string,
  dateString: string,
  portions: number
) {
  const confirmUrl = `${APP_URL}/api/confirm/${token}`;

  await getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject: `Confirma tu reserva para el ${dateString}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Comedor Felipe VI</h1>
          <p style="color: #e0f2fe; margin: 8px 0 0 0;">Sistema de Reservas</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Has reservado <strong>${portions} comida${portions > 1 ? 's' : ''}</strong> para el <strong>${dateString}</strong>.</p>
          <p style="font-size: 16px; color: #374151;">Para confirmar tu reserva, haz clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Confirmar Reserva
            </a>
          </div>
          <p style="font-size: 14px; color: #9ca3af;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <a href="${confirmUrl}" style="color: #0ea5e9; word-break: break-all;">${confirmUrl}</a></p>
          <p style="font-size: 14px; color: #ef4444; margin-top: 20px;">⚠️ Este enlace expira en 24 horas. Si no confirmas, la reserva se cancelará automáticamente.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">CIFP Felipe VI — Segovia · Sistema de Reservas de Comedor</p>
        </div>
      </div>
    `,
  });
}

export async function sendRejectionEmail(
  to: string,
  name: string,
  dateString: string,
  reason: string
) {
  await getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject: `Tu reserva para el ${dateString} no ha podido confirmarse`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Comedor Felipe VI</h1>
          <p style="color: #e0f2fe; margin: 8px 0 0 0;">Sistema de Reservas</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Tu reserva para el <strong>${dateString}</strong> no ha podido confirmarse.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 14px;"><strong>Motivo:</strong> ${reason}</p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Puedes intentarlo de nuevo en otro día desde nuestra web.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">CIFP Felipe VI — Segovia · Sistema de Reservas de Comedor</p>
        </div>
      </div>
    `,
  });
}

export async function sendAdminRejectionEmail(
  to: string,
  name: string,
  dateString: string
) {
  await getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject: `Tu reserva para el ${dateString} ha sido rechazada`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Comedor Felipe VI</h1>
          <p style="color: #e0f2fe; margin: 8px 0 0 0;">Sistema de Reservas</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151;">Hola <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Tu reserva para el <strong>${dateString}</strong> ha sido rechazada por la administración.</p>
          <p style="font-size: 14px; color: #6b7280;">Si crees que es un error, contacta con la secretaría del centro.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">CIFP Felipe VI — Segovia · Sistema de Reservas de Comedor</p>
        </div>
      </div>
    `,
  });
}
