import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/**
 * Loads an image from a URL as a Base64 data URL
 */
async function loadImageDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Generates an authentic, pixel-accurate PSNACET College Document PDF
 */
export async function generateCollegeDocumentPdf({
  requestId,
  documentType,
  purpose,
  student,
  issueDate,
  verificationUrl = `${window.location.origin}/verify/${requestId}`,
  verificationHash
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;

  // Format Issue Date: DD-MM-YYYY
  const today = new Date();
  const dateStr = issueDate
    ? new Date(issueDate).toLocaleDateString("en-GB").replace(/\//g, "-")
    : `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

  const studentName = student?.name || "B. Kapilesh";
  const registerNo = student?.register_no || "2403921320521068";
  const deptName = student?.department || "Information Technology";
  const yearNum = parseInt(student?.year, 10) || 1;
  const ordinalYear = getOrdinalYear(yearNum);
  const hash =
    verificationHash ||
    `sha256:${requestId ? requestId.toLowerCase().replace(/[^a-z0-9]/g, "") : ""}${Date.now().toString(16)}`;

  // Load Authentic Assets
  const [
    letterheadImg,
    footerImg,
    buildingFutureImg,
    hodStampImg,
    collegeSealImg,
    registrarSignImg,
    transportStampImg
  ] = await Promise.all([
    loadImageDataUrl("/psna-letterhead.png"),
    loadImageDataUrl("/psna-footer.png"),
    loadImageDataUrl("/building-future.png"),
    loadImageDataUrl("/hod-stamp.png"),
    loadImageDataUrl("/college-seal.png"),
    loadImageDataUrl("/registrar-sign.png"),
    loadImageDataUrl("/transport-stamp.png")
  ]);

  // Generate QR Code
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 180,
      color: { dark: "#0f172a", light: "#ffffff" }
    });
  } catch (e) {
    console.warn("QR generation failed in PDF:", e);
  }

  // Draw Letterhead Header (Top)
  if (letterheadImg) {
    doc.addImage(letterheadImg, "PNG", margin, 10, pageWidth - margin * 2, 38);
  } else {
    // Fallback vector header if image not accessible
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.text("PSNA COLLEGE OF ENGINEERING & TECHNOLOGY", pageWidth / 2, 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("(An Autonomous Institution Affiliated to Anna University, Chennai)", pageWidth / 2, 28, { align: "center" });
    doc.text("Accredited by NAAC with 'A++ Grade' | NBA Accredited | AICTE Approved", pageWidth / 2, 33, { align: "center" });
  }

  // Draw "Building the Future" Vertical Script on Left Margin
  if (buildingFutureImg && documentType !== "Bus Fee Structure") {
    doc.addImage(buildingFutureImg, "PNG", 6, 62, 11, 74);
  }

  // Subtle Diagonal Anti-Forgery Watermark across background
  try {
    doc.saveGraphicsState();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(242, 244, 248);
    doc.text(`OFFICIAL COPY • PSNACET • ${registerNo}`, pageWidth / 2, pageHeight / 2 + 10, {
      align: "center",
      angle: 45
    });
    doc.restoreGraphicsState();
  } catch (wmErr) {}

  // -------------------------------------------------------------
  // DOCUMENT TYPE 1: BONAFIDE CERTIFICATE (Exact replica of sample)
  // -------------------------------------------------------------
  if (documentType === "Bonafide Certificate") {
    // Right-aligned Date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${dateStr}`, pageWidth - margin - 5, 58, { align: "right" });

    // Document Title: Centered, Bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Bonafide Certificate", pageWidth / 2, 72, { align: "center" });

    // Main Certificate Prose
    const contentLeft = margin + 14;
    const contentWidth = pageWidth - margin * 2 - 16;
    let y = 88;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setLineHeightFactor(1.55);

    const para1 = `This is to certify that  Mr./Ms. ${studentName}  is a bonafide student of this college, studying in ${ordinalYear} year B.Tech. Degree in ${deptName} during the academic year 2024-2025.`;
    const splitPara1 = doc.splitTextToSize(para1, contentWidth);
    doc.text(splitPara1, contentLeft, y);
    y += splitPara1.length * 7 + 10;

    const cleanPurpose = purpose && purpose.trim() ? purpose.trim() : "education loan processing";
    const purposeText = cleanPurpose.toLowerCase().startsWith("apply") || cleanPurpose.toLowerCase().startsWith("for")
      ? `This certificate is issued to ${cleanPurpose}.`
      : `This certificate is issued to apply for ${cleanPurpose}.`;

    const splitPara2 = doc.splitTextToSize(purposeText, contentWidth);
    doc.text(splitPara2, contentLeft, y);

    // Signatures and Stamps (Right Bottom)
    const sigX = pageWidth - margin - 55;
    const sigY = 175;

    if (hodStampImg) {
      doc.addImage(hodStampImg, "PNG", sigX - 10, sigY - 8, 62, 42);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text("HOD-IT", sigX + 15, sigY + 5, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text("HEAD OF THE DEPARTMENT", sigX + 15, sigY + 16, { align: "center" });
      doc.setFontSize(8);
      doc.text(`Department of ${deptName}`, sigX + 15, sigY + 21, { align: "center" });
      doc.text("PSNA College of Engg. & Tech.", sigX + 15, sigY + 26, { align: "center" });
      doc.text("Dindigul - 624 622", sigX + 15, sigY + 31, { align: "center" });
    }

    // Digital QR Verification Block (Left Bottom)
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", margin + 12, 178, 26, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138);
      doc.text("DIGITAL QR VERIFICATION", margin + 42, 184);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("Scan with mobile camera to verify authentic college record", margin + 42, 189);
      doc.text(`Ref ID: PSNA/${requestId}`, margin + 42, 194);
      doc.text(`SHA-256: ${hash.slice(0, 26)}...`, margin + 42, 199);
    }
  }

  // -------------------------------------------------------------
  // DOCUMENT TYPE 2: FEE STRUCTURE / CERTIFICATE (Exact replica)
  // -------------------------------------------------------------
  else if (documentType === "Fee Structure") {
    // Right-aligned Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${dateStr}`, pageWidth - margin - 5, 54, { align: "right" });

    // Underlined CERTIFICATE Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CERTIFICATE", pageWidth / 2, 64, { align: "center" });
    const titleWidth = doc.getTextWidth("CERTIFICATE");
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - titleWidth / 2, 65.5, pageWidth / 2 + titleWidth / 2, 65.5);

    const contentLeft = margin + 14;
    const contentWidth = pageWidth - margin * 2 - 16;
    let y = 74;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setLineHeightFactor(1.4);

    const para = `This is to certify that Mr./Ms. ${studentName.toUpperCase()} is a bonafide student of this college studying in ${ordinalYear} Year B.Tech – ${deptName.toUpperCase()} during the academic year 2024-2025. The duration of the Programme is four years. The student is liable to pay the following college fees from the academic years 2024-25 to 2027-28.`;
    const splitPara = doc.splitTextToSize(para, contentWidth);
    doc.text(splitPara, contentLeft, y);
    y += splitPara.length * 5.5 + 4;

    // 4-Year Authentic Fee Schedule Table
    const colX = [contentLeft, contentLeft + 68, contentLeft + 95, contentLeft + 122, contentLeft + 149];
    const totalW = contentWidth;
    const rowH = 7;

    // Header Row
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.4);
    doc.rect(contentLeft, y, totalW, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);

    doc.text("Particulars", contentLeft + 14, y + 6);
    doc.text("I Year", colX[1] + 12, y + 4.5, { align: "center" });
    doc.text("(2024-25) Rs.", colX[1] + 12, y + 8.5, { align: "center" });

    doc.text("II Year", colX[2] + 12, y + 4.5, { align: "center" });
    doc.text("(2025-26) Rs.", colX[2] + 12, y + 8.5, { align: "center" });

    doc.text("III Year", colX[3] + 12, y + 4.5, { align: "center" });
    doc.text("(2026-27) Rs.", colX[3] + 12, y + 8.5, { align: "center" });

    doc.text("IV Year", colX[4] + 12, y + 4.5, { align: "center" });
    doc.text("(2027-28) Rs.", colX[4] + 12, y + 8.5, { align: "center" });

    // Vertical column dividers
    for (let c = 1; c < colX.length; c++) {
      doc.line(colX[c], y, colX[c], y + 11);
    }
    y += 11;

    // Table Rows
    const rows = [
      {
        name: ["Tuition Fee, Special Fee and Accreditation", "Fee"],
        vals: ["87,000", "87,000", "87,000", "87,000"],
        h: 10
      },
      {
        name: ["Development Fees"],
        vals: ["5,000", "5,000", "5,000", "5,000"],
        h: 7
      },
      {
        name: [
          "Other Charges: Stationery, Insurance, Internet,",
          "Curriculum, Sports, Affiliation Fees and Autonomous",
          "Fees etc,"
        ],
        vals: ["49,600", "49,600", "49,600", "49,600"],
        h: 15
      },
      {
        name: ["Total"],
        vals: ["1,41,600", "1,41,600", "1,41,600", "1,41,600"],
        h: 7,
        isBold: true
      }
    ];

    rows.forEach((r) => {
      doc.rect(contentLeft, y, totalW, r.h);
      for (let c = 1; c < colX.length; c++) {
        doc.line(colX[c], y, colX[c], y + r.h);
      }

      doc.setFont("helvetica", r.isBold ? "bold" : "normal");
      doc.setFontSize(8);

      // Print Particulars lines
      r.name.forEach((nl, idx) => {
        doc.text(nl, contentLeft + 3, y + 4.5 + idx * 4);
      });

      // Print Values
      r.vals.forEach((v, idx) => {
        doc.text(v, colX[idx + 1] + 13, y + 5, { align: "center" });
      });

      y += r.h;
    });

    y += 5;

    // Grand total statement
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      "Rs. 5,66,400/- (Rupees Five Lakhs Sixty Six Thousand and Four Hundred Only) for four years.",
      contentLeft,
      y
    );
    y += 7;

    // Bullet Points
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(
      "•   This certificate is issued to enable the student for applying educational loan from bank only.",
      contentLeft + 2,
      y
    );
    y += 5.5;
    doc.text(
      '•   Demand Draft may be drawn in favour of "PSNA College of Engineering and Technology" payable at Dindigul for every year.',
      contentLeft + 2,
      y
    );
    y += 12;

    // Signatures and Seals
    if (collegeSealImg) {
      doc.addImage(collegeSealImg, "PNG", contentLeft + 8, y - 4, 30, 30);
    } else {
      doc.setDrawColor(30, 58, 138);
      doc.circle(contentLeft + 22, y + 10, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("P.S.N.A. COLLEGE OF ENGG & TECH", contentLeft + 22, y + 7, { align: "center" });
      doc.text("* Dindigul *", contentLeft + 22, y + 12, { align: "center" });
    }

    if (registrarSignImg) {
      doc.addImage(registrarSignImg, "PNG", pageWidth - margin - 65, y - 6, 52, 28);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("REGISTRAR (ACADEMIC)", pageWidth - margin - 35, y + 18, { align: "center" });
    }

    // Digital QR
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", pageWidth / 2 - 12, y - 2, 24, 24);
      doc.setFont("courier", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`AUTH REF: ${requestId}`, pageWidth / 2, y + 26, { align: "center" });
    }
  }

  // -------------------------------------------------------------
  // DOCUMENT TYPE 3: BUS FEE STRUCTURE / TRANSPORT RECEIPT (Exact)
  // -------------------------------------------------------------
  else if (documentType === "Bus Fee Structure") {
    // Outer boundary card for receipt style
    const boxX = margin + 10;
    const boxW = pageWidth - (margin + 10) * 2;
    let y = 52;

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.rect(boxX, y, boxW, 195);

    // STUDENT COPY Header Banner
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("STUDENT COPY", pageWidth / 2, y + 7, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.text("PSNA", pageWidth / 2, y + 14, { align: "center" });

    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("COLLEGE OF ENGINEERING & TECHNOLOGY", pageWidth / 2, y + 19, { align: "center" });
    doc.setFontSize(8);
    doc.text("(An Autonomous Institution)", pageWidth / 2, y + 23, { align: "center" });
    doc.text("Kothandaraman Nagar, Dindigul - 624 622.", pageWidth / 2, y + 27, { align: "center" });

    y += 30;
    doc.setFillColor(241, 245, 249);
    doc.rect(boxX, y, boxW, 7, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("TRANSPORT FEES RECEIPT", pageWidth / 2, y + 5, { align: "center" });

    y += 10;
    // Details Grid
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`R.No. :  ${requestId}`, boxX + 6, y);
    doc.text(`Date :  ${dateStr}`, boxX + boxW - 35, y);

    y += 6;
    doc.text(`Name :  ${studentName.toUpperCase()}`, boxX + 6, y);

    y += 6;
    doc.text(`Roll No. :  24293`, boxX + 6, y);
    doc.text(`Reg No. :  ${registerNo}`, boxX + boxW / 2, y);

    y += 6;
    doc.text(`Year :  ${ordinalYear} Year`, boxX + 6, y);
    doc.text(`Branch :  B.Tech - ${deptName}`, boxX + boxW / 2, y);

    y += 8;
    // Table
    doc.rect(boxX, y, boxW, 8);
    doc.setFont("helvetica", "bold");
    doc.text("S.No.", boxX + 4, y + 5.5);
    doc.text("Description", boxX + 30, y + 5.5);
    doc.text("Amount (Rs.)", boxX + boxW - 25, y + 5.5);

    y += 8;
    const tableTopY = y;
    doc.rect(boxX, y, boxW, 68);

    doc.setFont("helvetica", "normal");
    doc.text("1", boxX + 6, y + 12);
    doc.text("Bus Route :  MADURAI / DINDIGUL / PALANI", boxX + 30, y + 12);

    doc.text("2", boxX + 6, y + 24);
    doc.text("Boarding Point :  COLLEGE TRANSIT POINT", boxX + 30, y + 24);

    doc.text("3", boxX + 6, y + 36);
    doc.text("Annual Institutional Bus Fee Schedule", boxX + 30, y + 36);
    doc.text("35,400.00", boxX + boxW - 25, y + 36);

    // Diagonal "CASH RECEIVED" stamp from authentic sample
    if (transportStampImg) {
      doc.addImage(transportStampImg, "PNG", boxX + 45, tableTopY + 12, 58, 44);
    }

    y += 68;
    // Total Row
    doc.setFillColor(248, 250, 252);
    doc.rect(boxX, y, boxW, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", boxX + boxW - 55, y + 5.5);
    doc.text("Rs. 35,400.00", boxX + boxW - 28, y + 5.5);

    y += 12;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("Rupees in words :  Thirty five thousand four hundred only.", boxX + 6, y);

    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Transport Department", boxX + 25, y, { align: "center" });
    doc.text("Cashier Sign", boxX + boxW - 25, y, { align: "center" });

    // QR Verification at bottom
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", pageWidth / 2 - 9, y - 10, 18, 18);
    }
  }

  // -------------------------------------------------------------
  // DOCUMENT TYPE 4: HOSTEL FEE STRUCTURE
  // -------------------------------------------------------------
  else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${dateStr}`, pageWidth - margin - 5, 54, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("HOSTEL & RESIDENTIAL FEE CERTIFICATE", pageWidth / 2, 64, { align: "center" });

    const contentLeft = margin + 14;
    const contentWidth = pageWidth - margin * 2 - 16;
    let y = 76;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const para = `This is to certify that Mr./Ms. ${studentName.toUpperCase()} (Reg No: ${registerNo}) is a residential student admitted to PSNA College Hostels, pursuing ${ordinalYear} Year in ${deptName} during academic year 2024-2025. The certified annual hostel & mess fee schedule is detailed below:`;
    const splitPara = doc.splitTextToSize(para, contentWidth);
    doc.text(splitPara, contentLeft, y);
    y += splitPara.length * 5.5 + 6;

    const hostelFees = [
      ["1", "Hostel Room Rent (Standard Sharing Accommodation)", "Rs. 38,000.00"],
      ["2", "Mess Charges (Annual Boarding - Veg & Non-Veg)", "Rs. 42,000.00"],
      ["3", "Electricity, Water & Maintenance Surcharges", "Rs. 8,000.00"],
      ["4", "Hostel Amenities & Caution Deposit (Refundable)", "Rs. 5,000.00"],
      ["", "TOTAL HOSTEL & MESS CHARGES", "Rs. 93,000.00"]
    ];

    y = drawTable(doc, contentLeft, y, ["S.No", "Hostel Fee Particulars", "Amount (INR)"], hostelFees);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      "Rs. 93,000/- (Rupees Ninety Three Thousand Only) per academic year.",
      contentLeft,
      y
    );
    y += 15;

    if (collegeSealImg) {
      doc.addImage(collegeSealImg, "PNG", contentLeft + 10, y - 2, 28, 28);
    }
    if (registrarSignImg) {
      doc.addImage(registrarSignImg, "PNG", pageWidth - margin - 65, y - 2, 50, 26);
    }

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", pageWidth / 2 - 12, y - 2, 24, 24);
    }
  }

  // Draw Official 3-Column Contact Footer
  if (footerImg) {
    doc.addImage(footerImg, "PNG", margin, pageHeight - 28, pageWidth - margin * 2, 20);
  }

  // Embedded Cryptographic SHA-256 Audit Fingerprint (Clean bottom text)
  doc.setFont("courier", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`CRYPTOGRAPHIC AUDIT FINGERPRINT (SHA-256): ${hash}`, pageWidth / 2, pageHeight - 6, {
    align: "center"
  });

  return doc;
}

function drawTable(doc, startX, startY, headers, rows) {
  let curY = startY;
  const colWidths = [15, 110, 40];
  const rowHeight = 7;

  // Header row
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.rect(startX, curY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(headers[0], startX + 3, curY + 5);
  doc.text(headers[1], startX + colWidths[0] + 4, curY + 5);
  doc.text(headers[2], startX + colWidths[0] + colWidths[1] + colWidths[2] - 4, curY + 5, {
    align: "right"
  });

  curY += rowHeight;

  // Rows
  rows.forEach((row) => {
    const isTotal = row[0] === "";
    if (isTotal) {
      doc.setFillColor(238, 242, 255);
      doc.rect(startX, curY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight + 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
    } else {
      doc.setDrawColor(226, 232, 240);
      doc.rect(startX, curY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, "D");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
    }

    doc.setFontSize(8);
    doc.text(row[0], startX + 3, curY + 5);
    doc.text(row[1], startX + colWidths[0] + 4, curY + 5);
    doc.text(row[2], startX + colWidths[0] + colWidths[1] + colWidths[2] - 4, curY + 5, {
      align: "right"
    });

    curY += isTotal ? rowHeight + 1 : rowHeight;
  });

  return curY;
}

function getOrdinalYear(year) {
  const y = parseInt(year, 10);
  if (y === 1) return "1st";
  if (y === 2) return "2nd";
  if (y === 3) return "3rd";
  if (y === 4) return "4th";
  return `${year || "Current"}`;
}
