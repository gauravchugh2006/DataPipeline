import PDFDocument from "pdfkit";

export const streamInvoice = (order, res) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${order.id}.pdf`
  );

  doc.pipe(res);

  doc
    .fontSize(20)
    .text("Cafe Commerce", { align: "left" })
    .moveDown(0.5)
    .fontSize(12)
    .text("10 Rue Gaston Levy")
    .text("Sevran-Livry, France 93270")
    .moveDown();

  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();

  doc.fontSize(14).text(`Invoice #${order.id}`, { align: "right" });
  doc
    .text(`Date: ${orderDate.toLocaleDateString()}`, {
      align: "right",
    })
    .moveDown();

  doc
    .fontSize(12)
    .text(
      `Billed to: ${
        order.customer?.firstName
          ? `${order.customer.firstName} ${order.customer.lastName || ""}`.trim()
          : order.customerName || "Cafe Commerce Customer"
      }`
    )
    .moveDown();

  doc.fontSize(12).text("Items:").moveDown(0.5);

  const tableTop = doc.y;
  const itemColumns = [40, 260, 360, 440];

  doc
    .font("Helvetica-Bold")
    .text("Product", itemColumns[0], tableTop)
    .text("Qty", itemColumns[1], tableTop)
    .text("Unit", itemColumns[2], tableTop)
    .text("Line Total", itemColumns[3], tableTop);

  doc.moveDown(0.5).font("Helvetica");

  const items = Array.isArray(order.items) ? order.items : [];

  items.forEach((item, index) => {
    const y = tableTop + 25 + index * 20;
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
    const lineTotal = unitPrice * quantity;

    doc
      .text(item.productName, itemColumns[0], y)
      .text(String(quantity), itemColumns[1], y)
      .text(`€${unitPrice.toFixed(2)}`, itemColumns[2], y)
      .text(`€${lineTotal.toFixed(2)}`, itemColumns[3], y);
  });

  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity || 1),
    0
  );
  const tax = subtotal * 0.08;
  const total = order.totalAmount ? Number(order.totalAmount) : subtotal + tax;

  doc.moveDown(2);
  doc
    .text(`Subtotal: €${subtotal.toFixed(2)}`, { align: "right" })
    .text(`Tax (8%): €${tax.toFixed(2)}`, { align: "right" })
    .font("Helvetica-Bold")
    .text(`Total: €${total.toFixed(2)}`, { align: "right" })
    .font("Helvetica")
    .moveDown();

  doc
    .fontSize(10)
    .text(
      "Thank you for shopping with Cafe Commerce. For support please contact support@cafecafe.example",
      {
        align: "center",
      }
    );

  doc.end();
};
