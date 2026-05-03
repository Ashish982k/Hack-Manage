import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 50;
const drawCenteredText = (args) => {
    const { page, text, y, size, font, color = rgb(0.1, 0.1, 0.1) } = args;
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = (page.getWidth() - textWidth) / 2;
    page.drawText(text, { x, y, size, font, color });
};
const drawWrappedText = (args) => {
    const { page, text, x, y, maxWidth, lineHeight, size, font, color = rgb(0.15, 0.15, 0.15), } = args;
    const words = text.split(" ");
    let currentLine = "";
    let cursorY = y;
    for (const word of words) {
        const candidateLine = currentLine ? `${currentLine} ${word}` : word;
        const candidateWidth = font.widthOfTextAtSize(candidateLine, size);
        if (candidateWidth <= maxWidth) {
            currentLine = candidateLine;
            continue;
        }
        if (currentLine) {
            page.drawText(currentLine, { x, y: cursorY, size, font, color });
            cursorY -= lineHeight;
        }
        currentLine = word;
    }
    if (currentLine) {
        page.drawText(currentLine, { x, y: cursorY, size, font, color });
        cursorY -= lineHeight;
    }
    return cursorY;
};
const drawFooter = (args) => {
    const { page, eventName, eventDateLabel, generatedAt, fontRegular } = args;
    page.drawLine({
        start: { x: PAGE_MARGIN, y: 44 },
        end: { x: PAGE_WIDTH - PAGE_MARGIN, y: 44 },
        thickness: 1,
        color: rgb(0.82, 0.82, 0.82),
    });
    drawCenteredText({
        page,
        text: `${eventName} • ${eventDateLabel}`,
        y: 28,
        size: 10,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
    });
    drawCenteredText({
        page,
        text: `Generated: ${generatedAt}`,
        y: 14,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
    });
};
const drawHeader = (args) => {
    const { page, title, eventName, fontRegular, fontBold, logo } = args;
    if (logo) {
        page.drawImage(logo, {
            x: PAGE_WIDTH / 2 - 35,
            y: PAGE_HEIGHT - 85,
            width: 70,
            height: 35,
        });
    }
    drawCenteredText({
        page,
        text: title,
        y: PAGE_HEIGHT - 120,
        size: 20,
        font: fontBold,
    });
    drawCenteredText({
        page,
        text: eventName,
        y: PAGE_HEIGHT - 144,
        size: 12,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
    });
    page.drawLine({
        start: { x: PAGE_MARGIN, y: PAGE_HEIGHT - 160 },
        end: { x: PAGE_WIDTH - PAGE_MARGIN, y: PAGE_HEIGHT - 160 },
        thickness: 1,
        color: rgb(0.82, 0.82, 0.82),
    });
    return PAGE_HEIGHT - 182;
};
export const generateTeamLogsReportPdf = async ({ title, eventName, eventDateLabel, teams, }) => {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const generatedAt = new Date().toLocaleString();
    let logo;
    const logoPath = path.resolve(process.cwd(), "..", "logo.png");
    try {
        const logoBytes = await readFile(logoPath);
        logo = await pdfDoc.embedPng(logoBytes);
    }
    catch {
        logo = undefined;
    }
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let cursorY = drawHeader({
        page,
        title,
        eventName,
        fontRegular,
        fontBold,
        logo,
    });
    for (const team of teams) {
        if (cursorY < 120) {
            drawFooter({ page, eventName, eventDateLabel, generatedAt, fontRegular });
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            cursorY = drawHeader({
                page,
                title,
                eventName,
                fontRegular,
                fontBold,
                logo,
            });
        }
        page.drawText(`Team: ${team.teamName}`, {
            x: PAGE_MARGIN,
            y: cursorY,
            size: 13,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
        });
        cursorY -= 18;
        if (team.members.length === 0) {
            page.drawText("- No members found", {
                x: PAGE_MARGIN + 12,
                y: cursorY,
                size: 11,
                font: fontRegular,
                color: rgb(0.2, 0.2, 0.2),
            });
            cursorY -= 18;
        }
        else {
            for (const member of team.members) {
                if (cursorY < 95) {
                    drawFooter({ page, eventName, eventDateLabel, generatedAt, fontRegular });
                    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    cursorY = drawHeader({
                        page,
                        title,
                        eventName,
                        fontRegular,
                        fontBold,
                        logo,
                    });
                    page.drawText(`Team: ${team.teamName} (contd.)`, {
                        x: PAGE_MARGIN,
                        y: cursorY,
                        size: 13,
                        font: fontBold,
                        color: rgb(0.1, 0.1, 0.1),
                    });
                    cursorY -= 18;
                }
                const rowText = `- ${member.memberName} -> Entry Pass: ` +
                    `${member.entryPassUsed ? "Used" : "Not Used"} | Food Pass: ` +
                    `${member.foodPassUsed ? "Used" : "Not Used"}`;
                cursorY = drawWrappedText({
                    page,
                    text: rowText,
                    x: PAGE_MARGIN + 12,
                    y: cursorY,
                    maxWidth: PAGE_WIDTH - PAGE_MARGIN * 2 - 12,
                    lineHeight: 14,
                    size: 11,
                    font: fontRegular,
                });
                cursorY -= 2;
            }
        }
        page.drawLine({
            start: { x: PAGE_MARGIN, y: cursorY + 4 },
            end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY + 4 },
            thickness: 1,
            color: rgb(0.9, 0.9, 0.9),
        });
        cursorY -= 12;
    }
    drawFooter({ page, eventName, eventDateLabel, generatedAt, fontRegular });
    return Buffer.from(await pdfDoc.save());
};
const drawSummaryRow = (args) => {
    const { page, x, y, width, height, label, value, labelFont, valueFont } = args;
    const valueColumnWidth = 140;
    page.drawRectangle({
        x,
        y,
        width,
        height,
        borderWidth: 1,
        borderColor: rgb(0.82, 0.82, 0.82),
    });
    page.drawLine({
        start: { x: x + width - valueColumnWidth, y },
        end: { x: x + width - valueColumnWidth, y: y + height },
        thickness: 1,
        color: rgb(0.82, 0.82, 0.82),
    });
    page.drawText(label, {
        x: x + 14,
        y: y + height / 2 - 6,
        size: 12,
        font: labelFont,
        color: rgb(0.2, 0.2, 0.2),
    });
    const valueText = String(value);
    const valueWidth = valueFont.widthOfTextAtSize(valueText, 14);
    page.drawText(valueText, {
        x: x + width - valueColumnWidth / 2 - valueWidth / 2,
        y: y + height / 2 - 7,
        size: 14,
        font: valueFont,
        color: rgb(0.08, 0.08, 0.08),
    });
};
export const generateFinalReportPdf = async ({ title, eventName, eventDateLabel, selectedUsersCount, enteredUsersCount, foodAvailableCount, foodUsedCount, }) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoPath = path.resolve(process.cwd(), "..", "logo.png");
    try {
        const logoBytes = await readFile(logoPath);
        const logo = await pdfDoc.embedPng(logoBytes);
        page.drawImage(logo, {
            x: width / 2 - 45,
            y: height - 105,
            width: 90,
            height: 45,
        });
    }
    catch {
        // Logo is optional
    }
    drawCenteredText({
        page,
        text: title,
        y: height - 145,
        size: 24,
        font: fontBold,
    });
    drawCenteredText({
        page,
        text: eventName,
        y: height - 175,
        size: 14,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
    });
    page.drawLine({
        start: { x: 50, y: height - 195 },
        end: { x: width - 50, y: height - 195 },
        thickness: 1,
        color: rgb(0.82, 0.82, 0.82),
    });
    const tableX = 60;
    const tableWidth = width - 120;
    const rowHeight = 52;
    const tableTopY = height - 280;
    const rows = [
        { label: "Selected winners/finalists", value: selectedUsersCount },
        { label: "Participants entered (checked-in)", value: enteredUsersCount },
        { label: "Food items available", value: foodAvailableCount },
        { label: "Food items used", value: foodUsedCount },
    ];
    rows.forEach((row, index) => {
        const y = tableTopY - index * rowHeight;
        drawSummaryRow({
            page,
            x: tableX,
            y,
            width: tableWidth,
            height: rowHeight,
            label: row.label,
            value: row.value,
            labelFont: fontRegular,
            valueFont: fontBold,
        });
    });
    const generatedAt = new Date().toLocaleString();
    drawCenteredText({
        page,
        text: `${eventName} • ${eventDateLabel}`,
        y: 52,
        size: 11,
        font: fontRegular,
        color: rgb(0.38, 0.38, 0.38),
    });
    drawCenteredText({
        page,
        text: `Generated: ${generatedAt}`,
        y: 35,
        size: 10,
        font: fontRegular,
        color: rgb(0.45, 0.45, 0.45),
    });
    return Buffer.from(await pdfDoc.save());
};
