// Sends email through Resend (https://resend.com) using plain fetch, no extra package.
// If RESEND_API_KEY is not set, the email is printed in the terminal instead (good for testing).
export async function sendMail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'Baihua Awards <onboarding@resend.dev>';

  if (!key) {
    console.log('\n--- EMAIL (no RESEND_API_KEY set, not really sent) ---');
    console.log(`To: ${to}\nSubject: ${subject}\n\n${text}\n------------------------------------------------------\n`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text })
  });
  if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
}

export function confirmationEmail(entry) {
  const name = entry.name;
  return {
    to: entry.email,
    subject: 'We received your entry: Dan-Zhong Baihua International Zodiac Award',
    text:
`Dear ${name},

Thank you. We have received your entry.

Reference number: ${entry._id}
Category: ${entry.category}
Work title: ${entry.workTitle}${entry.paymentStatus === 'paid' ? `\nPayment received: ${(entry.amount / 100).toFixed(entry.amount % 100 ? 2 : 0)} ${entry.currency || 'CNY'}` : ''}

Please keep this number for any questions to the Organizing Committee.
Preliminary review starts in early December 2026. We will contact you if your entry goes forward.

Please use only the official channels of the Organizing Committee, and beware of impersonators.

Organizing Committee
Dan-Zhong Baihua International Zodiac Award`
  };
}

export function loginCodeEmail(email, code) {
  return {
    to: email,
    subject: `Your sign-in code: ${code}`,
    text:
`Your sign-in code is ${code}
It is valid for 10 minutes. If you did not ask for it, you can ignore this email.

你的登录验证码是 ${code}
10分钟内有效。如果不是您本人操作，请忽略此邮件。

Dan-Zhong Baihua International Zodiac Award`
  };
}

// Sent when an entrant chooses bank transfer: what to pay, where to look, and the reference to write
export function paymentInstructionsEmail(entry, link) {
  const amount = `${(entry.amount / 100).toFixed(entry.amount % 100 ? 2 : 0)} ${entry.currency || 'CNY'}`;
  return {
    to: entry.email,
    subject: 'How to pay your entry fee: Dan-Zhong Baihua International Zodiac Award',
    text:
`Dear ${entry.name},

Your entry "${entry.workTitle}" is saved. It counts once your payment is confirmed.

Amount to pay: ${amount}
Reference to write in the transfer remarks: BH-${String(entry._id).slice(-8).toUpperCase()}

Bank details and instructions: ${link}

We confirm payments by hand, so please allow a few working days. You will get a confirmation email.

亲爱的 ${entry.name}，

您的作品「${entry.workTitle}」已保存，付款确认后报名才算完成。
应付金额：${amount}
转账备注请填写：BH-${String(entry._id).slice(-8).toUpperCase()}
收款账户和付款说明：${link}
我们会人工确认收款，请耐心等待几个工作日，确认后会发送邮件通知。

Organizing Committee / 组委会
Dan-Zhong Baihua International Zodiac Award`
  };
}
