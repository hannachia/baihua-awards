// Bank transfer details shown to entrants who pay by bank transfer
// (used when PAYMENT_PROVIDER=manual, or ALLOW_BANK_TRANSFER=true on the server).
// Fill in the [brackets]. These details are shown publicly to people who are about to pay,
// so use the account that is meant for receiving the entry fees.
export const bank = {
  beneficiaryName: '[Beneficiary name]',
  accountNumber: '[Account number]',
  bankName: 'Bank of China, Shanghai, Liuzhou Road Sub-Branch',
  bankAddress: 'No.430 Liuzhou Road, Shanghai, China',
  postCode: '200233',
  swift: 'BKCHCNBJ300'
};

// Optional WeChat Pay QR image for payments in CNY. Put the image at client/public/pay/wechat-qr.png
// and set enabled: true. Use a MERCHANT collection code, not a personal one (see the update notes).
export const wechatQr = { enabled: false, image: '/pay/wechat-qr.png' };
