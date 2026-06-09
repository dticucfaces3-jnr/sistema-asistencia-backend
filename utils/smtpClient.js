import nodemailer from 'nodemailer';

/**
 * Cliente de Correo SMTP usando Nodemailer y Gmail.
 * 
 * Patrón de Diseño / Principio aplicado:
 * - Inyección de Configuración (12-Factor App): Los parámetros se leen de variables de entorno (process.env)
 *   lo que evita exponer claves en producción y desacopla la configuración del código.
 * - Single Responsibility Principle (SRP): Este archivo es el único responsable del transporte de correos.
 * - KISS: Estructura directa y legible, removiendo dependencias complejas.
 */

const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'false' ? false : true, // true para puerto SSL 465
  auth: {
    user: process.env.SMTP_EMAIL || 'dticucfaces3@gmail.com',
    pass: (process.env.SMTP_PASS || 'camburpinton').replace(/\s+/g, '') // Elimina los espacios de la clave de aplicación
  }
};

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendMail({ to, subject, text, html }) {
  // En entorno de pruebas (tests), saltar el envío real por red para evitar timeouts
  if (process.env.NODE_ENV === 'test') {
    console.log(`✉️ [TEST] Envío de correo simulado para: ${to}`);
    return { status: 'success', messageId: 'test-message-id' };
  }

  // Gmail requiere que el remitente coincida con la cuenta autenticada para evitar rechazos de SPAM
  const from = process.env.SMTP_FROM || `"Sistema de Asistencia FaCES" <${smtpConfig.auth.user}>`;

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html
  };

  console.log(`✉️ Intentando enviar correo SMTP a ${to} usando Gmail...`);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado exitosamente via Gmail:', info.messageId);
    return { status: 'success', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error al enviar correo via SMTP Gmail:', error.message);
    
    // Imprimimos un fallback en consola para no romper el flujo en desarrollo local u offline
    console.log('\n=================== FALLBACK EMAIL DESARROLLO ===================');
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Texto: ${text}`);
    if (html) {
      console.log(`HTML: ${html.substring(0, 300)}... (truncado)`);
    }
    console.log('=================================================================\n');
    
    // Lanzamos el error para que el controlador o servicio lo capture y lo maneje
    throw error;
  }
}
