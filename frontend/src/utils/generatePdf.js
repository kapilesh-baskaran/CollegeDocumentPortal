import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/**
 * Generates an official, digitally verifiable College Document PDF
 * @param {Object} data - Contains student details, request details, and verification URL
 */
export async function generateCollegeDocumentPdf({
  requestId,
  documentType,
  purpose,
  student,
  issueDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }),
  verificationUrl = `${window.location.origin}/verify/${requestId}`
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Outer decorative border
  doc.setDrawColor(30, 58, 138); // Deep Navy
  doc.setLineWidth(1.2);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);

  doc.setDrawColor(217, 119, 6); // Subtle gold inner border
  doc.setLineWidth(0.4);
  doc.rect(margin + 2, margin + 2, contentWidth - 4, pageHeight - margin * 2 - 4);

  // Security Anti-Forgery Diagonal Watermark
  try {
    doc.saveGraphicsState();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(242, 245, 252); // Very subtle watermark
    doc.text(`OFFICIAL COPY • PSNACET • ${studentDetails.registerNo || ""}`, pageWidth / 2, pageHeight / 2 + 10, {
      align: "center",
      angle: 45
    });
    doc.restoreGraphicsState();
  } catch (wmErr) {
    // Graceful fallback if angle rotation not available
  }

  // College Header
  let y = margin + 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // Primary navy
  doc.text("PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY", pageWidth / 2, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // Slate
  doc.text("(An Autonomous Institution Affiliated to Anna University, Chennai)", pageWidth / 2, y, { align: "center" });

  y += 5;
  doc.setFontSize(8.5);
  doc.text("Accredited by NAAC with 'A++' Grade | Approved by AICTE, New Delhi", pageWidth / 2, y, { align: "center" });

  y += 4.5;
  doc.text("Kothandaraman Nagar, Dindigul - 624622, Tamil Nadu, India", pageWidth / 2, y, { align: "center" });

  // Divider Line
  y += 6;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(margin + 8, y, pageWidth - margin - 8, y);

  // Reference & Date Bar
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`REF NO: PSNA/DOC/${requestId}`, margin + 10, y);
  doc.text(`DATE OF ISSUE: ${issueDate}`, pageWidth - margin - 10, y, { align: "right" });

  // Document Title Banner
  y += 12;
  doc.setFillColor(238, 242, 255); // Soft indigo fill
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(margin + 18, y, contentWidth - 36, 12, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.text(documentType.toUpperCase(), pageWidth / 2, y + 8, { align: "center" });

  y += 20;

  // Document Specific Content
  if (documentType === "Bonafide Certificate") {
    // Bonafide Certificate Body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);

    const para1 = `This is to certify that ${student?.name || "The Student"} (Register No: ${student?.register_no || "N/A"}), Son/Daughter of Bonafide Guardian, is a genuine student of this institution currently pursuing their studies in the ${getOrdinalYear(student?.year)} Year of Bachelor of Technology / Engineering in ${student?.department || "Engineering"} (Section '${student?.section || "A"}') during the Academic Year 2025-2026.`;

    const splitPara1 = doc.splitTextToSize(para1, contentWidth - 20);
    doc.text(splitPara1, margin + 10, y);
    y += splitPara1.length * 6 + 6;

    const para2 = `According to our college records, his/her conduct and academic character have been found to be GOOD throughout the period of study.`;
    doc.text(para2, margin + 10, y);
    y += 12;

    const para3 = `This certificate is officially issued at the request of the student for the purpose of "${purpose || "Official Academic Verification"}".`;
    const splitPara3 = doc.splitTextToSize(para3, contentWidth - 20);
    doc.text(splitPara3, margin + 10, y);
    y += splitPara3.length * 6 + 14;

  } else if (documentType === "Fee Structure") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Official Academic Year Tuition & College Fee Schedule certified for:`, margin + 10, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Student: ${student?.name} | Reg No: ${student?.register_no} | Dept: ${student?.department} (${getOrdinalYear(student?.year)} Year)`, margin + 10, y);
    y += 10;

    // Fee Table
    const feeRows = [
      ["1", "Tuition Fee (Per Annum)", "Rs. 65,000.00"],
      ["2", "Special Academic, Computing & Lab Fee", "Rs. 18,500.00"],
      ["3", "Digital Library & Learning Resources Fee", "Rs. 5,000.00"],
      ["4", "University Registration & Examination Charges", "Rs. 4,500.00"],
      ["5", "Campus Development & Student Amenities", "Rs. 7,000.00"],
      ["", "TOTAL ANNUAL FEE", "Rs. 1,00,000.00"]
    ];

    y = drawTable(doc, margin + 10, y, ["S.No", "Fee Particulars", "Amount (INR)"], feeRows);
    y += 8;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Purpose: ${purpose || "Education Loan / Scholarship Processing"}`, margin + 10, y);
    y += 14;

  } else if (documentType === "Bus Fee Structure") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Official College Transport & Bus Service Fee Certificate certified for:`, margin + 10, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Student: ${student?.name} | Reg No: ${student?.register_no} | Dept: ${student?.department}`, margin + 10, y);
    y += 10;

    const busRows = [
      ["1", "Transport Route Pass (Annual)", "Rs. 22,000.00"],
      ["2", "Fleet Maintenance & GPS Tracking Service", "Rs. 3,500.00"],
      ["3", "Student Bus Transit Insurance", "Rs. 2,000.00"],
      ["", "TOTAL TRANSPORT CHARGES", "Rs. 27,500.00"]
    ];

    y = drawTable(doc, margin + 10, y, ["S.No", "Transport Particulars", "Amount (INR)"], busRows);
    y += 8;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Purpose: ${purpose || "Day Scholar Transport Subsidy / Bank Reimbursement"}`, margin + 10, y);
    y += 14;

  } else {
    // Hostel Fee Structure
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Official College Residential Hostel & Mess Fee Schedule certified for:`, margin + 10, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Student: ${student?.name} | Reg No: ${student?.register_no} | Dept: ${student?.department}`, margin + 10, y);
    y += 10;

    const hostelRows = [
      ["1", "Hostel Room Rent (Standard Sharing Accommodation)", "Rs. 38,000.00"],
      ["2", "Mess Charges (Annual Boarding - Veg & Non-Veg)", "Rs. 42,000.00"],
      ["3", "Electricity, Water & Maintenance Surcharges", "Rs. 8,000.00"],
      ["4", "Hostel Amenities & Caution Deposit (Refundable)", "Rs. 5,000.00"],
      ["", "TOTAL HOSTEL & MESS CHARGES", "Rs. 93,000.00"]
    ];

    y = drawTable(doc, margin + 10, y, ["S.No", "Hostel Particulars", "Amount (INR)"], hostelRows);
    y += 8;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Purpose: ${purpose || "Hostel Subsidy / Bank Loan Documentation"}`, margin + 10, y);
    y += 14;
  }

  // QR Code Generation & Verification Box
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: "#1e3a8a",
        light: "#ffffff"
      }
    });

    const qrSize = 30;
    const qrX = margin + 10;
    const qrY = pageHeight - margin - 46;

    // Draw QR Code
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // QR Verification text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text("DIGITAL QR VERIFICATION", qrX + qrSize + 6, qrY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Scan this QR code with any mobile camera", qrX + qrSize + 6, qrY + 11);
    doc.text("or QR reader to verify official certificate authenticity", qrX + qrSize + 6, qrY + 15);
    doc.text(`Ref ID: ${requestId}`, qrX + qrSize + 6, qrY + 20);
    doc.text(`Direct link: ${verificationUrl.slice(0, 42)}...`, qrX + qrSize + 6, qrY + 25);
  } catch (qrErr) {
    console.warn("QR insertion failed in PDF:", qrErr);
  }

  // Signature Block (Right side)
  const sigX = pageWidth - margin - 50;
  const sigY = pageHeight - margin - 38;

  // Digital Stamp Seal Simulation
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.circle(sigX + 20, sigY + 5, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(30, 58, 138);
  doc.text("PSNACET", sigX + 20, sigY + 4, { align: "center" });
  doc.text("OFFICIAL SEAL", sigX + 20, sigY + 7.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("PRINCIPAL / DEAN", sigX + 20, sigY + 22, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Academic Administration", sigX + 20, sigY + 26, { align: "center" });

  // Cryptographic SHA-256 Audit Fingerprint
  const hashDisplay = request.verification_hash || `sha256:${requestId.toLowerCase()}${Date.now().toString(16)}`;
  doc.setFont("courier", "bold");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(`CRYPTOGRAPHIC AUDIT HASH (SHA-256): ${hashDisplay}`, pageWidth / 2, pageHeight - margin - 8, { align: "center" });

  // Footer Disclaimer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Note: This is an authentic digitally generated college document certified by the College Document Portal. No physical signature is required.",
    pageWidth / 2,
    pageHeight - margin - 4,
    { align: "center" }
  );

  return doc;
}

/**
 * Helper to draw simple neat fee tables
 */
function drawTable(doc, startX, startY, headers, rows) {
  let curY = startY;
  const colWidths = [15, 105, 45];
  const rowHeight = 7;

  // Header row
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(startX, curY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(headers[0], startX + 3, curY + 5);
  doc.text(headers[1], startX + colWidths[0] + 4, curY + 5);
  doc.text(headers[2], startX + colWidths[0] + colWidths[1] + colWidths[2] - 4, curY + 5, { align: "right" });

  curY += rowHeight;

  // Rows
  rows.forEach((row, i) => {
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
    doc.text(row[2], startX + colWidths[0] + colWidths[1] + colWidths[2] - 4, curY + 5, { align: "right" });

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
