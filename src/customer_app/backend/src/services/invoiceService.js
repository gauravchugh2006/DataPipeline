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

  doc
    .fontSize(14)
    .text(`Invoice #${order.id}`, { align: "right" })
    .text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, {
      align: "right",
    })
    .moveDown();

  doc
    .fontSize(12)
    .text(`Billed to: ${order.customer_name || "Cafe Commerce Customer"}`)
    .moveDown();

  doc.fontSize(12).text("Items:").moveDown(0.5);

  const tableTop = doc.y;
  const itemColumns = [40, 220, 320, 400, 480];

  doc
    .font("Helvetica-Bold")
    .text("Product", itemColumns[0], tableTop)
    .text("Variant", itemColumns[1], tableTop)
    .text("Qty", itemColumns[2], tableTop)
    .text("Unit", itemColumns[3], tableTop)
    .text("Line Total", itemColumns[4], tableTop);

  doc.moveDown(0.5).font("Helvetica");

  order.items.forEach((item, index) => {
    const y = tableTop + 25 + index * 20;
    const lineTotal = Number(item.unitPrice) * Number(item.quantity);

    doc
      .text(item.productName, itemColumns[0], y)
      .text(`${item.color} / ${item.size}`, itemColumns[1], y)
      .text(String(item.quantity), itemColumns[2], y)
      .text(`€${Number(item.unitPrice).toFixed(2)}`, itemColumns[3], y)
      .text(`€${lineTotal.toFixed(2)}`, itemColumns[4], y);
  });

  doc.moveDown(2);
  doc
    .text(`Subtotal: €${Number(order.subtotal).toFixed(2)}`, { align: "right" })
    .text(`Tax (8%): €${Number(order.tax).toFixed(2)}`, { align: "right" })
    .font("Helvetica-Bold")
    .text(`Total: €${Number(order.total).toFixed(2)}`, { align: "right" })
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
