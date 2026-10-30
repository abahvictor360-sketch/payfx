const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const { logos } = require('./icons');
const { EXCHANGE_RATE } = require('./catalog');
const business = require('./business');
const { ngn, date, gatewayName } = require('./format');

// The built-in PDF fonts have no ₦ glyph, so amounts are written as "NGN".
module.exports = function renderInvoicePdf(order, stream) {
  const biz = business();
  const paid = order.status === 'paid';
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, left: 48, right: 48, bottom: 24 }, info: { Title: `Invoice ${order.invoiceNumber}` } });
  doc.pipe(stream);

  const navy = '#1F3A5F';
  const muted = '#6B7280';
  const left = 48;
  const right = doc.page.width - 48;
  const width = right - left;

  // Header
  doc.fillColor(navy).font('Helvetica-Bold').fontSize(20).text(biz.name, left, 48);
  doc.font('Helvetica').fontSize(9).fillColor(muted)
    .text([biz.address, biz.email, biz.phone].filter(Boolean).join('\n'), left, 74, { width: 250 });

  doc.font('Helvetica-Bold').fontSize(22).fillColor(navy)
    .text(paid ? 'RECEIPT' : 'INVOICE', left, 48, { width, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#111')
    .text(`Invoice no. ${order.invoiceNumber}`, left, 76, { width, align: 'right' })
    .text(`Issued ${date(order.createdAt)}`, { width, align: 'right' });
  if (paid) doc.text(`Paid ${date(order.paidAt)}`, { width, align: 'right' });

  const stampColor = paid ? '#059669' : '#B45309';
  doc.roundedRect(right - 70, 112, 70, 22, 4).lineWidth(1.5).strokeColor(stampColor).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(stampColor)
    .text(paid ? 'PAID' : 'UNPAID', right - 70, 118, { width: 70, align: 'center' });

  // Parties
  let y = 150;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor('#B08D7A').stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(muted).text('BILLED TO', left, y).text('PAYMENT', left + width / 2, y);
  y += 12;
  const billed = [order.customer.company, order.customer.email, order.customer.phone].filter(Boolean).join('\n');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text(order.customer.name, left, y, { width: width / 2 - 10 });
  doc.font('Helvetica').fontSize(9).text(billed, { width: width / 2 - 10 });
  const payLines = [
    `Method: ${gatewayName(order.gateway)}${order.channel ? ` (${order.channel})` : ''}`,
    `Reference: ${order.ref}`,
    order.transactionId ? `Transaction ID: ${order.transactionId}` : null,
  ].filter(Boolean).join('\n');
  doc.text(payLines, left + width / 2, y, { width: width / 2 });
  y = Math.max(doc.y, y + 40) + 12;

  // Table
  const cols = { item: left + 8, period: right - 160, amount: right - 8 };
  doc.rect(left, y, width, 22).fill(navy);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff')
    .text('Item or product', cols.item, y + 7)
    .text('Coverage', cols.period, y + 7)
    .text('Amount', left, y + 7, { width: width - 8, align: 'right' });
  y += 22;

  order.items.forEach((item, i) => {
    const textX = cols.item + 30;
    const textW = cols.period - textX - 12;
    doc.font('Helvetica').fontSize(8);
    const purposeH = doc.heightOfString(item.purpose, { width: textW });
    const rowH = Math.max(30, 14 + purposeH + 7);
    if (y + rowH > doc.page.height - 60) { doc.addPage(); y = 48; }
    if (i % 2) doc.rect(left, y, width, rowH).fill('#F5F6F8');

    SVGtoPDF(doc, logos[item.logo].svg, cols.item, y + 6, { width: 20, height: 20 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(navy)
      .text(item.name + (item.subtitle ? ` - ${item.subtitle}` : ''), textX, y + 5, { width: textW });
    doc.font('Helvetica').fontSize(8).fillColor(muted).text(item.purpose, textX, doc.y + 1, { width: textW });
    doc.font('Helvetica').fontSize(9).fillColor('#111').text(item.period, cols.period, y + 6);
    doc.text(ngn(item.amount), left, y + 6, { width: width - 8, align: 'right' });
    y += rowH;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
  });

  // Totals
  if (y > doc.page.height - 130) { doc.addPage(); y = 48; }
  y += 14;
  const tx = right - 240;
  doc.font('Helvetica').fontSize(10).fillColor('#111')
    .text('Subtotal', tx, y).text(ngn(order.total), tx, y, { width: 240, align: 'right' });
  y += 20;
  doc.rect(tx - 8, y - 6, 248, 26).fill(navy);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
    .text(paid ? 'Total paid' : 'Total due', tx, y + 2).text(ngn(order.total), tx, y + 2, { width: 232, align: 'right' });
  y += 30;
  doc.font('Helvetica').fontSize(8).fillColor(muted)
    .text(`Approx. US$${(order.total / EXCHANGE_RATE).toLocaleString('en-US', { maximumFractionDigits: 2 })} at US$1 = NGN ${EXCHANGE_RATE.toLocaleString()}`, tx, y, { width: 240, align: 'right' });

  doc.fontSize(8).fillColor(muted).text(
    paid ? 'Thank you, your payment has been received.' : 'This invoice is payable online by Flutterwave or Paystack.',
    left, y + 22, { width, align: 'center' },
  );
  doc.end();
};
