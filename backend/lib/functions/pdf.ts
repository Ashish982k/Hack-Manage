import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

type GenerateCertificatePdfInput = {
  winnerName: string;
  teamName: string;
  eventName: string;
  eventYear: string;
  position: number;
  date: string;
  location: string;
};

export const generateCertificatePdf = async ({
  winnerName,
  teamName,
  eventName,
  eventYear,
  position,
  date,
  location,
}: GenerateCertificatePdfInput): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const logoPath = path.resolve(process.cwd(), "..", "logo.png");
  const logoBytes = await readFile(logoPath);
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await pdfDoc.embedFont(
    StandardFonts.HelveticaBoldOblique,
  );

  let cursiveFont = fontItalic;
  try {
    const cursiveFontPath = path.resolve(
      process.cwd(),
      "..",
      "DancingScript.ttf",
    );
    const cursiveFontBytes = await readFile(cursiveFontPath);
    cursiveFont = await pdfDoc.embedFont(cursiveFontBytes);
  } catch (err) {
    console.error("Could not load cursive font, falling back to italic.", err);
  }

  const drawCenter = (
    text: string,
    y: number,
    size: number,
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
    color = rgb(0.12, 0.12, 0.12),
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = (width - textWidth) / 2;
    page.drawText(text, { x, y, size, font, color });
  };

  type TextSegment = {
    text: string;
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  };
  const drawMixedCenter = (
    segments: TextSegment[],
    y: number,
    size: number,
  ) => {
    const totalWidth = segments.reduce(
      (sum, seg) => sum + seg.font.widthOfTextAtSize(seg.text, size),
      0,
    );
    let currentX = (width - totalWidth) / 2;
    segments.forEach((seg) => {
      page.drawText(seg.text, {
        x: currentX,
        y,
        size,
        font: seg.font,
        color: rgb(0.12, 0.12, 0.12),
      });
      currentX += seg.font.widthOfTextAtSize(seg.text, size);
    });
  };

  const drawLeft = (
    text: string,
    x: number,
    y: number,
    size: number,
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
    color = rgb(0.12, 0.12, 0.12),
  ) => {
    page.drawText(text, { x, y, size, font, color });
  };

  // ── Outer border ──────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 2,
  });

  // ── Logo ──────────────────────────────────────────────────────────────────
  page.drawImage(logoImage, {
    x: (width - 100) / 2,
    y: height - 100,
    width: 100,
    height: 50,
  });

  // ── Certificate title (light, smaller — not bold) ─────────────────────────
  drawCenter(
    "Certificate of Participation",
    height - 148,
    18,
    fontRegular,
    rgb(0.35, 0.35, 0.35),
  );

  // ── Decorative divider ────────────────────────────────────────────────────
  const divY = height - 162;
  const divW = 200;
  page.drawLine({
    start: { x: (width - divW) / 2, y: divY },
    end: { x: (width + divW) / 2, y: divY },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });

  // ── Winner name (large cursive) ────────────────────────────────────────────
  drawCenter(winnerName.trim() || "Participant", height - 210, 42, cursiveFont);

  // ── Body text: "of team X for their active participation in Y." ───────────
  const positionSuffix =
    position === 1
      ? "1st"
      : position === 2
        ? "2nd"
        : position === 3
          ? "3rd"
          : `${position}th`;

  const line1Segments: TextSegment[] = [
    { text: "of team ", font: fontRegular },
    { text: teamName.trim(), font: fontBold },
    { text: " for their active participation in ", font: fontRegular },
    { text: `${eventName}.`, font: fontRegular },
  ];

  const line2Segments: TextSegment[] = [
    { text: "They have secured ", font: fontRegular },
    { text: `${positionSuffix} place`, font: fontBold },
    { text: " in this event held on ", font: fontRegular },
    { text: date, font: fontRegular },
    { text: " at ", font: fontRegular },
    { text: `${location}.`, font: fontBold },
  ];

  // If line1 is too wide, split around "in" keyword
  const maxWidth = width - 120;
  const line1Width = line1Segments.reduce(
    (sum, seg) => sum + seg.font.widthOfTextAtSize(seg.text, 13),
    0,
  );

  if (line1Width > maxWidth) {
    // Split at "in <eventName>"
    const partA: TextSegment[] = [
      { text: "of team ", font: fontRegular },
      { text: teamName.trim(), font: fontBold },
      { text: " for their active participation", font: fontRegular },
    ];
    const partB: TextSegment[] = [
      { text: `in ${eventName}.`, font: fontRegular },
    ];
    drawMixedCenter(partA, height - 255, 13);
    drawMixedCenter(partB, height - 272, 13);
    drawMixedCenter(line2Segments, height - 295, 13);
  } else {
    drawMixedCenter(line1Segments, height - 255, 13);
    drawMixedCenter(line2Segments, height - 278, 13);
  }

  const footerLineY = 105;
  const nameY = footerLineY - 22;
  const titleY = nameY - 16;

  const signatories = [
    {
      name: "Ayaansh Churi",
      title: "General Secretary, COC VJTI",
    },
    {
      name: "Dr. M. M. Chandane",
      title: "Faculty Advisor, COC VJTI",
    },
    {
      name: "Dr. V.B. Nikam",
      title: "HOD, Department of CE & IT",
    },
  ];

  const sigLineLen = 160;
  const margin = 60;
  const sigSpacing =
    (width - 2 * margin - signatories.length * sigLineLen) /
    (signatories.length - 1);

  signatories.forEach((sig, idx) => {
    const lineX = margin + idx * (sigLineLen + sigSpacing);

    // Signature line
    page.drawLine({
      start: { x: lineX, y: footerLineY },
      end: { x: lineX + sigLineLen, y: footerLineY },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Name — bold, centered under the line
    const nameW = fontBold.widthOfTextAtSize(sig.name, 11);
    const nameCenterX = lineX + (sigLineLen - nameW) / 2;
    page.drawText(sig.name, {
      x: nameCenterX,
      y: nameY,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Title — italic, centered under the name
    const titleW = fontItalic.widthOfTextAtSize(sig.title, 9);
    const titleCenterX = lineX + (sigLineLen - titleW) / 2;
    page.drawText(sig.title, {
      x: titleCenterX,
      y: titleY,
      size: 9,
      font: fontItalic,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  // ── Certificate date (small, centered at very bottom) ─────────────────────
  const currentDate = new Date();
  const dateStr = `Issued on: ${currentDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
  drawCenter(dateStr, 45, 8, fontRegular, rgb(0.55, 0.55, 0.55));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
