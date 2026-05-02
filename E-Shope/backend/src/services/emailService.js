const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST) return null;
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    return transporter;
}

function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

async function sendOrderConfirmation(user, order, items) {
    const t = getTransporter();
    if (!t || !user.email) return;

    const from = process.env.SMTP_FROM || 'ApniDunia <noreply@apnidunia.com>';
    const itemRows = items.map(item => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8de">${item.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8de;text-align:center">${item.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8de;text-align:right">${formatCurrency(item.price)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0e8de;text-align:right">${formatCurrency(item.price * item.quantity)}</td>
        </tr>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#FAFAF7">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#E85D04,#FB8500);padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:24px">ApniDunia</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.9);font-size:14px">Order Confirmed!</p>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#374151;font-size:16px">Hi ${user.name},</p>
      <p style="color:#6B7280;font-size:14px">Thank you for your order. We've received it and will process it shortly.</p>
      <div style="background:#FFF5EB;border:1px solid #FDE0C0;border-radius:6px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:13px;color:#6B7280">Order ID</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#E85D04">#${order.id}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#FFF5EB">
            <th style="padding:10px 12px;text-align:left;color:#4B5563">Item</th>
            <th style="padding:10px 12px;text-align:center;color:#4B5563">Qty</th>
            <th style="padding:10px 12px;text-align:right;color:#4B5563">Price</th>
            <th style="padding:10px 12px;text-align:right;color:#4B5563">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#1C1917">Total</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#E85D04;font-size:16px">${formatCurrency(order.total)}</td>
          </tr>
        </tfoot>
      </table>
      ${order.address ? `<p style="color:#6B7280;font-size:13px;margin-top:16px"><strong>Delivery to:</strong> ${order.address}</p>` : ''}
      <p style="color:#9CA3AF;font-size:12px;margin-top:24px;border-top:1px solid #F3F4F6;padding-top:16px">
        This is an automated email from ApniDunia. Please do not reply.
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
        await t.sendMail({
            from,
            to: user.email,
            subject: `Order Confirmed — #${order.id} | ApniDunia`,
            html,
        });
        console.log(`[Email] Order confirmation sent to ${user.email}`);
    } catch (err) {
        console.error('[Email] Failed to send order confirmation:', err.message);
    }
}

module.exports = { sendOrderConfirmation };
