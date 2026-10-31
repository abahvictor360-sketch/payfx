const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const { logos } = require('./icons');
const business = require('./business');
const { orderLogos } = require('./invoice-html');
const { moneyPdf, date, gatewayName, equivalent } = require('./format');

// Black-and-white invoice/receipt. The built-in PDF fonts have no ₦ glyph,
// so amounts are written with the currency code ("NGN", "USD").
module.exports = function renderInvoicePdf(order, stream) {
  const biz = business();
  const paid = order.status === 'paid';
  const currency = order.currency || 'NGN';
  const fmt = (n) => moneyPdf(n, currency);
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 48, left: 48, right: 48, bottom: 24 },
    info: { Title: `${paid ? 'Receipt' : 'Invoice'} ${order.invoiceNumber}` },
  });
  doc.pipe(stream);

  const black = '#000000';
  const grey = '#555555';
  const rule = '#BBBBBB';
  const left = 48;
  const right = doc.page.width - 48;
  const width = right - left;

  // Header: logos of the items paid for, then the document title on the right.
  const tile = 46;
  const perRow = 7;
  orderLogos(order).forEach((logo, i) => {
    const x = left + (i % perRow) * tile;
    const y = 48 + Math.floor(i / perRow) * 44;
    SVGtoPDF(doc, logo.mono, x + 12, y, { width: 20, height: 20 });
    doc.font('Helvetica').fontSize(6.5).fillColor(black).text(logo.title, x, y + 23, { width: tile - 2, align: 'center' });
  });
  const logoRows = Math.ceil(orderLogos(order).length / perRow);

  doc.font('Helvetica-Bold').fontSize(22).fillColor(black)
    .text(paid ? 'RECEIPT' : 'INVOICE', left, 48, { width, align: 'right', characterSpacing: 2 });
  doc.font('Helvetica').fontSize(9)
    .text(`No. ${order.invoiceNumber}`, left, 76, { width, align: 'right' })
    .text(`Issued ${date(order.createdAt)}`, { width, align: 'right' });
  if (paid) doc.text(`Paid ${date(order.paidAt)}`, { width, align: 'right' });
  doc.rect(right - 70, 112, 70, 22).lineWidth(1.5).strokeColor(black).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(black)
    .text(paid ? 'PAID' : 'UNPAID', right - 70, 118, { width: 70, align: 'center', characterSpacing: 2 });

  // Parties
  let y = Math.max(144, 48 + logoRows * 44 + 6);
  doc.moveTo(left, y).lineTo(right, y).lineWidth(1.5).strokeColor(black).stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(grey).text('BILLED TO', left, y).text('PAYMENT', left + width / 2, y);
  y += 12;
  const billed = [order.customer.company, order.customer.email, order.customer.phone].filter(Boolean).join('\n');
  doc.font('Helvetica-Bold').fontSize(10).fillColor(black).text(order.customer.name, left, y, { width: width / 2 - 10 });
  doc.font('Helvetica').fontSize(9).text(billed, { width: width / 2 - 10 });
  const billedBottom = doc.y;
  const payLines = [
    `Method: ${gatewayName(order.gateway)}${order.channel ? ` (${order.channel})` : ''}`,
    `Reference: ${order.ref}`,
    order.transactionId ? `Transaction ID: ${order.transactionId}` : null,
  ].filter(Boolean).join('\n');
  doc.text(payLines, left + width / 2, y, { width: width / 2 });
  y = Math.max(doc.y, billedBottom, y + 40) + 12;

  // Table
  const cols = { item: left + 4, period: right - 160 };
  const header = () => {
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1.5).strokeColor(black).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(black)
      .text('ITEM OR PRODUCT', cols.item, y + 6)
      .text('COVERAGE', cols.period, y + 6)
      .text('AMOUNT', left, y + 6, { width: width - 4, align: 'right' });
    y += 18;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.75).strokeColor(black).stroke();
  };
  header();

  order.items.forEach((item) => {
    const textX = cols.item + 30;
    const textW = cols.period - textX - 12;
    doc.font('Helvetica').fontSize(8);
    const purposeH = doc.heightOfString(item.purpose, { width: textW });
    const rowH = Math.max(28, 13 + purposeH + 6);
    if (y + rowH > doc.page.height - 60) { doc.addPage(); y = 48; header(); }

    SVGtoPDF(doc, logos[item.logo].mono, cols.item, y + 6, { width: 18, height: 18 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(black)
      .text(item.name + (item.subtitle ? ` - ${item.subtitle}` : ''), textX, y + 5, { width: textW });
    doc.font('Helvetica').fontSize(8).fillColor(grey).text(item.purpose, textX, doc.y + 1, { width: textW });
    doc.font('Helvetica').fontSize(9).fillColor(black).text(item.period, cols.period, y + 6);
    doc.text(fmt(item.amount), left, y + 6, { width: width - 4, align: 'right' });
    y += rowH;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(rule).stroke();
  });

  // Totals
  if (y > doc.page.height - 130) { doc.addPage(); y = 48; }
  y += 14;
  const tx = right - 240;
  doc.font('Helvetica').fontSize(10).fillColor(black)
    .text('Subtotal', tx, y).text(fmt(order.total), tx, y, { width: 240, align: 'right' });
  y += 18;
  doc.moveTo(tx, y).lineTo(right, y).lineWidth(1.5).strokeColor(black).stroke();
  doc.font('Helvetica-Bold').fontSize(11)
    .text(paid ? 'Total paid' : 'Total due', tx, y + 7).text(fmt(order.total), tx, y + 7, { width: 240, align: 'right' });
  y += 24;
  doc.moveTo(tx, y).lineTo(right, y).lineWidth(1.5).strokeColor(black).stroke();
  y += 8;
  doc.font('Helvetica').fontSize(8).fillColor(grey)
    .text(equivalent(order, moneyPdf), tx - 60, y, { width: 300, align: 'right' });

  const contact = [biz.address, biz.email, biz.phone].filter(Boolean).join('  ·  ');
  doc.fontSize(8).fillColor(grey).text(
    [paid ? 'Thank you, your payment has been received.' : 'This invoice is payable online by Flutterwave or Paystack.', contact]
      .filter(Boolean).join('\n'),
    left, y + 22, { width, align: 'center' },
  );
  doc.end();
};
