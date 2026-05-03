import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export const generateCertificatePdf = async ({ winnerName, teamName, eventName, eventYear, }) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();
    // Backend is inside project root, so logo is one level up.
    const logoPath = path.resolve(process.cwd(), "..", "logo.png");
    const logoBytes = await readFile(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const drawCenter = (text, y, size, font) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        const x = (width - textWidth) / 2;
        page.drawText(text, { x, y, size, font, color: rgb(0.12, 0.12, 0.12) });
    };
    page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 2,
    });
    page.drawImage(logoImage, {
        x: (width - 130) / 2,
        y: height - 110,
        width: 130,
        height: 65,
    });
    drawCenter("Certificate of Achievement", height - 180, 34, fontBold);
    drawCenter(winnerName.trim() || "Winner", height - 270, 32, fontBold);
    drawCenter(teamName.trim() || "Team", height - 320, 20, fontRegular);
    drawCenter("For winning the Hackathon", height - 365, 18, fontRegular);
    drawCenter(`${eventName.trim()} ${eventYear.trim()}`, 55, 14, fontRegular);
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
};
