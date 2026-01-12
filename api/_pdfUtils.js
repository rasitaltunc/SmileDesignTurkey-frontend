// api/_pdfUtils.js
// Shared PDF generation utilities using pdf-lib

const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

/**
 * Generate Doctor Note PDF
 * @param {Object} params
 * @param {string} params.clinicName - Clinic name
 * @param {string} params.caseCode - Case code (e.g., CASE-12345)
 * @param {string} params.leadId - Lead ID (TEXT)
 * @param {string} params.doctorName - Doctor full name
 * @param {string} params.doctorTitle - Doctor title
 * @param {string} params.noteMarkdown - Note content (markdown text)
 * @param {Array} params.items - Line items [{catalog_item_name, qty, unit_price, notes, total}]
 * @param {string} params.approvedAt - ISO timestamp
 * @param {string|null} params.signatureImageUrl - Optional signature image URL (base64 or data URL)
 * @returns {Promise<Uint8Array>} PDF bytes
 */
async function generateDoctorNotePDF({
  clinicName = "Smile Design Turkey",
  caseCode,
  leadId,
  doctorName,
  doctorTitle,
  noteMarkdown,
  items = [],
  approvedAt,
  signatureImageUrl = null,
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  // Fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50; // Start from top

  // Header: Clinic Name
  page.drawText(clinicName, {
    x: 50,
    y: y,
    size: 20,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Case Code & Lead ID
  page.drawText(`Case Code: ${caseCode || "N/A"}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText(`Lead ID: ${leadId || "N/A"}`, {
    x: 300,
    y: y,
    size: 12,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 30;

  // Doctor Info
  page.drawText(`Doctor: ${doctorName || "N/A"}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  if (doctorTitle) {
    page.drawText(`Title: ${doctorTitle}`, {
      x: 300,
      y: y,
      size: 12,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  y -= 40;

  // Horizontal line
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 30;

  // Note Content (simple markdown to text conversion)
  const noteText = noteMarkdown
    ? noteMarkdown
        .replace(/#{1,6}\s+/g, "") // Remove headers
        .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.+?)\*/g, "$1") // Remove italic
        .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links
        .trim()
    : "No notes provided.";

  // Split note into lines (simple word wrap)
  const maxWidth = width - 100;
  const words = noteText.split(/\s+/);
  let currentLine = "";
  const lines = [];

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = helvetica.widthOfTextAtSize(testLine, 11);
    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Draw note lines
  page.drawText("Doctor Notes:", {
    x: 50,
    y: y,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  for (const line of lines) {
    if (y < 100) {
      // New page if needed
      const newPage = pdfDoc.addPage([595, 842]);
      y = newPage.getSize().height - 50;
    }
    page.drawText(line, {
      x: 50,
      y: y,
      size: 11,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    y -= 15;
  }
  y -= 20;

  // Line Items Table
  if (items && items.length > 0) {
    if (y < 200) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = newPage.getSize().height - 50;
    }

    page.drawText("Estimated Procedures/Materials:", {
      x: 50,
      y: y,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    // Table header
    page.drawText("Item", {
      x: 50,
      y: y,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page.drawText("Qty", {
      x: 300,
      y: y,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page.drawText("Unit Price", {
      x: 350,
      y: y,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page.drawText("Total", {
      x: 450,
      y: y,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    // Table rows
    let grandTotal = 0;
    for (const item of items) {
      if (y < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = newPage.getSize().height - 50;
      }

      const itemName = item.catalog_item_name || item.name || "Unknown";
      const qty = item.qty || 0;
      const unitPrice = item.unit_price || 0;
      const total = qty * unitPrice;
      grandTotal += total;

      // Truncate long item names
      const displayName = itemName.length > 30 ? itemName.substring(0, 27) + "..." : itemName;

      page.drawText(displayName, {
        x: 50,
        y: y,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      page.drawText(String(qty), {
        x: 300,
        y: y,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      page.drawText(`$${unitPrice.toFixed(2)}`, {
        x: 350,
        y: y,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      page.drawText(`$${total.toFixed(2)}`, {
        x: 450,
        y: y,
        size: 10,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      y -= 18;
    }

    // Grand total
    if (y < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = newPage.getSize().height - 50;
    }
    y -= 10;
    page.drawLine({
      start: { x: 350, y: y },
      end: { x: width - 50, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 20;
    page.drawText("Total Estimated Cost:", {
      x: 350,
      y: y,
      size: 12,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    page.drawText(`$${grandTotal.toFixed(2)}`, {
      x: 450,
      y: y,
      size: 12,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;
  }

  // Approval timestamp
  if (approvedAt) {
    if (y < 100) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = newPage.getSize().height - 50;
    }

    const approvedDate = new Date(approvedAt).toLocaleString();
    page.drawText(`Approved: ${approvedDate}`, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 30;
  }

  // Signature (if provided)
  if (signatureImageUrl) {
    try {
      // Handle base64 data URL or fetch from URL
      let imageBytes;
      if (signatureImageUrl.startsWith("data:image")) {
        const base64Data = signatureImageUrl.split(",")[1];
        imageBytes = Buffer.from(base64Data, "base64");
      } else if (signatureImageUrl.startsWith("http")) {
        // Fetch from URL
        const fetch = require("node-fetch");
        const response = await fetch(signatureImageUrl);
        imageBytes = Buffer.from(await response.arrayBuffer());
      } else {
        console.warn("[_pdfUtils] Signature format not supported, skipping");
      }

      if (imageBytes) {
        if (y < 150) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = newPage.getSize().height - 50;
        }

        // Try PNG first, fallback to JPG
        let signatureImage;
        try {
          signatureImage = await pdfDoc.embedPng(imageBytes);
        } catch (pngErr) {
          try {
            signatureImage = await pdfDoc.embedJpg(imageBytes);
          } catch (jpgErr) {
            console.warn("[_pdfUtils] Failed to embed signature image:", jpgErr.message);
            signatureImage = null;
          }
        }

        if (signatureImage) {
          const signatureDims = signatureImage.scale(0.3); // Scale down

          page.drawImage(signatureImage, {
            x: 50,
            y: y - signatureDims.height,
            width: signatureDims.width,
            height: signatureDims.height,
          });
          y -= signatureDims.height + 20;
        }
      }
    } catch (sigErr) {
      console.warn("[_pdfUtils] Failed to embed signature:", sigErr.message);
    }
  }

  // Footer
  const footerY = 30;
  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: 50,
    y: footerY,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Generate Quote/Proforma PDF (similar structure but for quotes)
 */
async function generateQuotePDF({
  clinicName = "Smile Design Turkey",
  caseCode,
  leadId,
  quoteNumber,
  items = [],
  discount = 0,
  generatedAt,
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // Header
  page.drawText(clinicName, {
    x: 50,
    y: y,
    size: 20,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  page.drawText("PROFORMA INVOICE", {
    x: 50,
    y: y,
    size: 16,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  page.drawText(`Quote #: ${quoteNumber || "N/A"}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText(`Case Code: ${caseCode || "N/A"}`, {
    x: 300,
    y: y,
    size: 12,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 40;

  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 30;

  // Items table (similar to doctor note)
  if (items && items.length > 0) {
    page.drawText("Services & Materials:", {
      x: 50,
      y: y,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    // Table header
    page.drawText("Item", { x: 50, y: y, size: 10, font: helveticaBold, color: rgb(0, 0, 0) });
    page.drawText("Qty", { x: 300, y: y, size: 10, font: helveticaBold, color: rgb(0, 0, 0) });
    page.drawText("Unit Price", { x: 350, y: y, size: 10, font: helveticaBold, color: rgb(0, 0, 0) });
    page.drawText("Total", { x: 450, y: y, size: 10, font: helveticaBold, color: rgb(0, 0, 0) });
    y -= 20;

    let subtotal = 0;
    for (const item of items) {
      if (y < 100) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = newPage.getSize().height - 50;
      }

      const itemName = item.catalog_item_name || item.name || "Unknown";
      const qty = item.qty || 0;
      const unitPrice = item.unit_price || 0;
      const total = qty * unitPrice;
      subtotal += total;

      const displayName = itemName.length > 30 ? itemName.substring(0, 27) + "..." : itemName;

      page.drawText(displayName, { x: 50, y: y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
      page.drawText(String(qty), { x: 300, y: y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
      page.drawText(`$${unitPrice.toFixed(2)}`, { x: 350, y: y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
      page.drawText(`$${total.toFixed(2)}`, { x: 450, y: y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
      y -= 18;
    }

    // Totals
    if (y < 150) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = newPage.getSize().height - 50;
    }
    y -= 10;
    page.drawLine({ start: { x: 350, y: y }, end: { x: width - 50, y: y }, thickness: 1, color: rgb(0, 0, 0) });
    y -= 20;

    page.drawText("Subtotal:", { x: 350, y: y, size: 11, font: helvetica, color: rgb(0, 0, 0) });
    page.drawText(`$${subtotal.toFixed(2)}`, { x: 450, y: y, size: 11, font: helvetica, color: rgb(0, 0, 0) });
    y -= 20;

    if (discount > 0) {
      page.drawText(`Discount (${discount}%):`, { x: 350, y: y, size: 11, font: helvetica, color: rgb(0, 0, 0) });
      const discountAmount = (subtotal * discount) / 100;
      page.drawText(`-$${discountAmount.toFixed(2)}`, { x: 450, y: y, size: 11, font: helvetica, color: rgb(0, 0, 0) });
      y -= 20;
    }

    page.drawText("Total:", { x: 350, y: y, size: 12, font: helveticaBold, color: rgb(0, 0, 0) });
    const finalTotal = discount > 0 ? subtotal - (subtotal * discount) / 100 : subtotal;
    page.drawText(`$${finalTotal.toFixed(2)}`, { x: 450, y: y, size: 12, font: helveticaBold, color: rgb(0, 0, 0) });
  }

  // Footer
  page.drawText(`Generated: ${generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString()}`, {
    x: 50,
    y: 30,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = {
  generateDoctorNotePDF,
  generateQuotePDF,
};

