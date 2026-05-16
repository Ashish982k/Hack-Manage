import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PDFName } from "pdf-lib";
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 50;
const drawCenteredText = (args) => {
    const { page, text, y, size, font, color = rgb(0.1, 0.1, 0.1), centerX } = args;
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = centerX !== undefined ? centerX - textWidth / 2 : (page.getWidth() - textWidth) / 2;
    page.drawText(text, { x, y, size, font, color });
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
const drawHeader = (args) => {
    const { page, title, eventName, eventDateLabel, generatedAt, fontRegular, fontBold, logo } = args;
    let cursorY = PAGE_HEIGHT - 60;
    if (logo) {
        page.drawImage(logo, {
            x: PAGE_WIDTH / 2 - 35,
            y: cursorY - 15,
            width: 70,
            height: 35,
        });
        cursorY -= 40;
    }
    drawCenteredText({
        page,
        text: title,
        y: cursorY,
        size: 22,
        font: fontBold,
    });
    cursorY -= 18;
    drawCenteredText({
        page,
        text: `${eventName} • ${eventDateLabel}`,
        y: cursorY,
        size: 11,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
    });
    cursorY -= 14;
    drawCenteredText({
        page,
        text: `Generated: ${generatedAt}`,
        y: cursorY,
        size: 9,
        font: fontRegular,
        color: rgb(0.6, 0.6, 0.6),
    });
    cursorY -= 20;
    page.drawLine({
        start: { x: PAGE_MARGIN, y: cursorY },
        end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.85),
    });
    return cursorY - 25;
};
const drawSummaryCards = (args) => {
    const { page, y, totalTeams, totalMembers, totalEntryUsed, totalFoodUsed, fontRegular, fontBold } = args;
    const cards = [
        { label: "Total Teams", value: totalTeams },
        { label: "Total Members", value: totalMembers },
        { label: "Entry Used", value: totalEntryUsed },
        { label: "Food Used", value: totalFoodUsed },
    ];
    const cardWidth = 115;
    const spacing = (PAGE_WIDTH - 2 * PAGE_MARGIN - 4 * cardWidth) / 3;
    for (let i = 0; i < cards.length; i++) {
        const cardX = PAGE_MARGIN + i * (cardWidth + spacing);
        page.drawRectangle({
            x: cardX,
            y: y - 50,
            width: cardWidth,
            height: 50,
            borderWidth: 1,
            borderColor: rgb(0.85, 0.85, 0.85),
            color: rgb(0.98, 0.98, 0.98),
        });
        drawCenteredText({
            page,
            text: String(cards[i].value),
            centerX: cardX + cardWidth / 2,
            y: y - 22,
            size: 16,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
        });
        drawCenteredText({
            page,
            text: cards[i].label,
            centerX: cardX + cardWidth / 2,
            y: y - 38,
            size: 9,
            font: fontRegular,
            color: rgb(0.4, 0.4, 0.4),
        });
    }
    return y - 75;
};
export const generateTeamLogsReportPdf = async ({ title, eventName, eventDateLabel, adminEmail, teams, }) => {
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
        eventDateLabel,
        generatedAt,
        fontRegular,
        fontBold,
        logo,
    });
    const totalTeams = teams.length;
    const totalMembers = teams.reduce((acc, team) => acc + team.members.length, 0);
    const totalEntryUsed = teams.reduce((acc, team) => acc + team.members.filter(m => m.entryPassUsed).length, 0);
    const totalFoodUsed = teams.reduce((acc, team) => acc + team.members.filter(m => m.foodPassUsed).length, 0);
    cursorY = drawSummaryCards({
        page,
        y: cursorY,
        totalTeams,
        totalMembers,
        totalEntryUsed,
        totalFoodUsed,
        fontRegular,
        fontBold,
    });
    for (const team of teams) {
        if (cursorY < 120) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            cursorY = drawHeader({
                page,
                title,
                eventName,
                eventDateLabel,
                generatedAt,
                fontRegular,
                fontBold,
                logo,
            });
        }
        page.drawRectangle({
            x: PAGE_MARGIN,
            y: cursorY - 24,
            width: PAGE_WIDTH - PAGE_MARGIN * 2,
            height: 24,
            color: rgb(0.92, 0.92, 0.92),
            borderWidth: 1,
            borderColor: rgb(0.85, 0.85, 0.85),
        });
        page.drawText(`Team: ${team.teamName}`, {
            x: PAGE_MARGIN + 10,
            y: cursorY - 16,
            size: 11,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
        });
        cursorY -= 24;
        const col1X = PAGE_MARGIN + 10;
        const col2X = PAGE_WIDTH - PAGE_MARGIN - 180;
        const col3X = PAGE_WIDTH - PAGE_MARGIN - 80;
        page.drawText("Member Name", { x: col1X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        drawCenteredText({ page, text: "Entry Pass", centerX: col2X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        drawCenteredText({ page, text: "Food Pass", centerX: col3X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        page.drawLine({
            start: { x: PAGE_MARGIN, y: cursorY - 20 },
            end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 },
            thickness: 1,
            color: rgb(0.85, 0.85, 0.85),
        });
        cursorY -= 20;
        if (team.members.length === 0) {
            page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_MARGIN, y: cursorY - 24 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
            page.drawLine({ start: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 24 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
            page.drawText("- No members found", {
                x: PAGE_MARGIN + 10,
                y: cursorY - 16,
                size: 10,
                font: fontRegular,
                color: rgb(0.4, 0.4, 0.4),
            });
            cursorY -= 24;
        }
        else {
            for (let i = 0; i < team.members.length; i++) {
                const member = team.members[i];
                if (cursorY < 100) {
                    page.drawLine({
                        start: { x: PAGE_MARGIN, y: cursorY },
                        end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY },
                        thickness: 1,
                        color: rgb(0.85, 0.85, 0.85),
                    });
                    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    cursorY = drawHeader({
                        page,
                        title,
                        eventName,
                        eventDateLabel,
                        generatedAt,
                        fontRegular,
                        fontBold,
                        logo,
                    });
                    page.drawRectangle({
                        x: PAGE_MARGIN,
                        y: cursorY - 24,
                        width: PAGE_WIDTH - PAGE_MARGIN * 2,
                        height: 24,
                        color: rgb(0.92, 0.92, 0.92),
                        borderWidth: 1,
                        borderColor: rgb(0.85, 0.85, 0.85),
                    });
                    page.drawText(`Team: ${team.teamName} (contd.)`, {
                        x: PAGE_MARGIN + 10,
                        y: cursorY - 16,
                        size: 11,
                        font: fontBold,
                        color: rgb(0.1, 0.1, 0.1),
                    });
                    cursorY -= 24;
                    page.drawText("Member Name", { x: col1X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                    drawCenteredText({ page, text: "Entry Pass", centerX: col2X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                    drawCenteredText({ page, text: "Food Pass", centerX: col3X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                    page.drawLine({
                        start: { x: PAGE_MARGIN, y: cursorY - 20 },
                        end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 },
                        thickness: 1,
                        color: rgb(0.85, 0.85, 0.85),
                    });
                    cursorY -= 20;
                }
                if (i % 2 !== 0) {
                    page.drawRectangle({
                        x: PAGE_MARGIN,
                        y: cursorY - 20,
                        width: PAGE_WIDTH - PAGE_MARGIN * 2,
                        height: 20,
                        color: rgb(0.97, 0.97, 0.97),
                    });
                }
                page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                page.drawLine({ start: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                page.drawText(member.memberName, {
                    x: col1X,
                    y: cursorY - 14,
                    size: 10,
                    font: fontRegular,
                    color: rgb(0.15, 0.15, 0.15),
                });
                drawCenteredText({
                    page,
                    text: member.entryPassUsed ? "Used" : "-",
                    centerX: col2X,
                    y: cursorY - 14,
                    size: 10,
                    font: fontRegular,
                    color: member.entryPassUsed ? rgb(0.1, 0.6, 0.1) : rgb(0.5, 0.5, 0.5),
                });
                drawCenteredText({
                    page,
                    text: member.foodPassUsed ? "Used" : "-",
                    centerX: col3X,
                    y: cursorY - 14,
                    size: 10,
                    font: fontRegular,
                    color: member.foodPassUsed ? rgb(0.1, 0.6, 0.1) : rgb(0.5, 0.5, 0.5),
                });
                cursorY -= 20;
            }
        }
        page.drawLine({
            start: { x: PAGE_MARGIN, y: cursorY },
            end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY },
            thickness: 1,
            color: rgb(0.85, 0.85, 0.85),
        });
        cursorY -= 25;
    }
    const pages = pdfDoc.getPages();
    pages.forEach((p, idx) => {
        p.drawLine({
            start: { x: PAGE_MARGIN, y: 70 },
            end: { x: PAGE_WIDTH - PAGE_MARGIN, y: 70 },
            thickness: 1,
            color: rgb(0.85, 0.85, 0.85),
        });
        p.drawText("Prepared for", {
            x: PAGE_MARGIN,
            y: 52,
            size: 10,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
        });
        p.drawText("Event Administration", {
            x: PAGE_MARGIN,
            y: 40,
            size: 10,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3),
        });
        p.drawText(`email: ${adminEmail}`, {
            x: PAGE_MARGIN,
            y: 28,
            size: 10,
            font: fontRegular,
            color: rgb(0.4, 0.4, 0.4),
        });
        const pageText = `Page ${idx + 1} of ${pages.length}`;
        const textWidth = fontRegular.widthOfTextAtSize(pageText, 10);
        p.drawText(pageText, {
            x: PAGE_WIDTH - PAGE_MARGIN - textWidth,
            y: 40,
            size: 10,
            font: fontRegular,
            color: rgb(0.4, 0.4, 0.4),
        });
    });
    return Buffer.from(await pdfDoc.save());
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
const addLink = (page, url, rect) => {
    const doc = page.doc;
    const link = doc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: url },
    });
    let annots = page.node.get(PDFName.of('Annots'));
    if (!annots) {
        annots = doc.context.obj([]);
        page.node.set(PDFName.of('Annots'), annots);
    }
    annots.push(link);
};
export const generateTeamAnalyticsPdf = async ({ title, eventName, eventDateLabel, adminEmail, teams, }) => {
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
        page, title, eventName, eventDateLabel, generatedAt, fontRegular, fontBold, logo,
    });
    const totalTeams = teams.length;
    const totalMembers = teams.reduce((acc, team) => acc + team.members.length, 0);
    const cards = [
        { label: "Total Teams", value: totalTeams },
        { label: "Total Members", value: totalMembers },
    ];
    const cardWidth = 140;
    const spacing = (PAGE_WIDTH - 2 * PAGE_MARGIN - 2 * cardWidth);
    const card1X = PAGE_MARGIN + spacing / 3;
    const card2X = PAGE_WIDTH - PAGE_MARGIN - spacing / 3 - cardWidth;
    page.drawRectangle({ x: card1X, y: cursorY - 50, width: cardWidth, height: 50, borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85), color: rgb(0.98, 0.98, 0.98) });
    drawCenteredText({ page, text: String(cards[0].value), centerX: card1X + cardWidth / 2, y: cursorY - 22, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    drawCenteredText({ page, text: cards[0].label, centerX: card1X + cardWidth / 2, y: cursorY - 38, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    page.drawRectangle({ x: card2X, y: cursorY - 50, width: cardWidth, height: 50, borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85), color: rgb(0.98, 0.98, 0.98) });
    drawCenteredText({ page, text: String(cards[1].value), centerX: card2X + cardWidth / 2, y: cursorY - 22, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    drawCenteredText({ page, text: cards[1].label, centerX: card2X + cardWidth / 2, y: cursorY - 38, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    cursorY -= 75;
    for (const team of teams) {
        if (cursorY < 120) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            cursorY = drawHeader({ page, title, eventName, eventDateLabel, generatedAt, fontRegular, fontBold, logo });
        }
        page.drawRectangle({
            x: PAGE_MARGIN, y: cursorY - 24, width: PAGE_WIDTH - PAGE_MARGIN * 2, height: 24,
            color: rgb(0.92, 0.92, 0.92), borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85),
        });
        page.drawText(`Team: ${team.teamName}`, { x: PAGE_MARGIN + 10, y: cursorY - 16, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        let linkXOffset = PAGE_WIDTH - PAGE_MARGIN - 10;
        if (team.pptUrl) {
            const linkText = "Presentation";
            const textWidth = fontBold.widthOfTextAtSize(linkText, 9);
            linkXOffset -= textWidth;
            page.drawText(linkText, { x: linkXOffset, y: cursorY - 15, size: 9, font: fontBold, color: rgb(0.1, 0.4, 0.8) });
            page.drawLine({ start: { x: linkXOffset, y: cursorY - 16 }, end: { x: linkXOffset + textWidth, y: cursorY - 16 }, thickness: 0.5, color: rgb(0.1, 0.4, 0.8) });
            addLink(page, team.pptUrl, { x: linkXOffset, y: cursorY - 16, width: textWidth, height: 10 });
            linkXOffset -= 15;
        }
        if (team.githubUrl) {
            const linkText = "GitHub";
            const textWidth = fontBold.widthOfTextAtSize(linkText, 9);
            linkXOffset -= textWidth;
            page.drawText(linkText, { x: linkXOffset, y: cursorY - 15, size: 9, font: fontBold, color: rgb(0.1, 0.4, 0.8) });
            page.drawLine({ start: { x: linkXOffset, y: cursorY - 16 }, end: { x: linkXOffset + textWidth, y: cursorY - 16 }, thickness: 0.5, color: rgb(0.1, 0.4, 0.8) });
            addLink(page, team.githubUrl, { x: linkXOffset, y: cursorY - 16, width: textWidth, height: 10 });
        }
        cursorY -= 24;
        const col1X = PAGE_MARGIN + 10;
        page.drawText("Member Name", { x: col1X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        page.drawLine({
            start: { x: PAGE_MARGIN, y: cursorY - 20 },
            end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 },
            thickness: 1, color: rgb(0.85, 0.85, 0.85),
        });
        cursorY -= 20;
        if (team.members.length === 0) {
            page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_MARGIN, y: cursorY - 24 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
            page.drawLine({ start: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 24 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
            page.drawText("- No members found", { x: PAGE_MARGIN + 10, y: cursorY - 16, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
            cursorY -= 24;
        }
        else {
            for (let i = 0; i < team.members.length; i++) {
                const member = team.members[i];
                if (cursorY < 100) {
                    page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    cursorY = drawHeader({ page, title, eventName, eventDateLabel, generatedAt, fontRegular, fontBold, logo });
                    page.drawRectangle({
                        x: PAGE_MARGIN, y: cursorY - 24, width: PAGE_WIDTH - PAGE_MARGIN * 2, height: 24,
                        color: rgb(0.92, 0.92, 0.92), borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85),
                    });
                    page.drawText(`Team: ${team.teamName} (contd.)`, { x: PAGE_MARGIN + 10, y: cursorY - 16, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
                    cursorY -= 24;
                    page.drawText("Member Name", { x: col1X, y: cursorY - 14, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                    page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY - 20 }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                    cursorY -= 20;
                }
                if (i % 2 !== 0) {
                    page.drawRectangle({ x: PAGE_MARGIN, y: cursorY - 20, width: PAGE_WIDTH - PAGE_MARGIN * 2, height: 20, color: rgb(0.97, 0.97, 0.97) });
                }
                page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                page.drawLine({ start: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                page.drawText(member.memberName, { x: col1X, y: cursorY - 14, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
                cursorY -= 20;
            }
        }
        page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        cursorY -= 25;
    }
    const pages = pdfDoc.getPages();
    pages.forEach((p, idx) => {
        p.drawLine({ start: { x: PAGE_MARGIN, y: 70 }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: 70 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        p.drawText("Prepared for", { x: PAGE_MARGIN, y: 52, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        p.drawText("Event Administration", { x: PAGE_MARGIN, y: 40, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
        p.drawText(`email: ${adminEmail}`, { x: PAGE_MARGIN, y: 28, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
        const pageText = `Page ${idx + 1} of ${pages.length}`;
        const textWidth = fontRegular.widthOfTextAtSize(pageText, 10);
        p.drawText(pageText, { x: PAGE_WIDTH - PAGE_MARGIN - textWidth, y: 40, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    });
    return Buffer.from(await pdfDoc.save());
};
export const generateJudgeAnalyticsPdf = async ({ title, eventName, eventDateLabel, adminEmail, teams, }) => {
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
    let cursorY = drawHeader({ page, title, eventName, eventDateLabel, generatedAt, fontRegular, fontBold, logo });
    for (const team of teams) {
        if (cursorY < 120) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            cursorY = drawHeader({ page, title, eventName, eventDateLabel, generatedAt, fontRegular, fontBold, logo });
        }
        page.drawRectangle({
            x: PAGE_MARGIN, y: cursorY - 24, width: PAGE_WIDTH - PAGE_MARGIN * 2, height: 24,
            color: rgb(0.92, 0.92, 0.92), borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85),
        });
        page.drawText(`Team: ${team.teamName}`, { x: PAGE_MARGIN + 10, y: cursorY - 16, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        cursorY -= 24;
        const col1X = PAGE_MARGIN + 10;
        const cols = [
            { name: "Judge Name", x: col1X, isCenter: false },
            { name: "Innov.", x: PAGE_WIDTH - PAGE_MARGIN - 300, isCenter: true },
            { name: "Feasib.", x: PAGE_WIDTH - PAGE_MARGIN - 240, isCenter: true },
            { name: "Techn.", x: PAGE_WIDTH - PAGE_MARGIN - 180, isCenter: true },
            { name: "Present.", x: PAGE_WIDTH - PAGE_MARGIN - 120, isCenter: true },
            { name: "Impact", x: PAGE_WIDTH - PAGE_MARGIN - 60, isCenter: true },
            { name: "Total", x: PAGE_WIDTH - PAGE_MARGIN - 10, isCenter: true },
        ];
        cols.forEach(col => {
            if (col.isCenter) {
                drawCenteredText({ page, text: col.name, centerX: col.x, y: cursorY - 14, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
            }
            else {
                page.drawText(col.name, { x: col.x, y: cursorY - 14, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
            }
        });
        page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY - 20 }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        cursorY -= 20;
        if (team.evaluations.length === 0) {
            page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_MARGIN, y: cursorY - 24 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
            page.drawLine({ start: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 24 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
            page.drawText("- No evaluations found", { x: PAGE_MARGIN + 10, y: cursorY - 16, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
            cursorY -= 24;
        }
        else {
            let avgTotal = 0;
            for (let i = 0; i < team.evaluations.length; i++) {
                const evalRecord = team.evaluations[i];
                avgTotal += evalRecord.total;
                if (cursorY < 100) {
                    page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
                    cursorY = drawHeader({ page, title, eventName, eventDateLabel, generatedAt, fontRegular, fontBold, logo });
                    page.drawRectangle({
                        x: PAGE_MARGIN, y: cursorY - 24, width: PAGE_WIDTH - PAGE_MARGIN * 2, height: 24,
                        color: rgb(0.92, 0.92, 0.92), borderWidth: 1, borderColor: rgb(0.85, 0.85, 0.85),
                    });
                    page.drawText(`Team: ${team.teamName} (contd.)`, { x: PAGE_MARGIN + 10, y: cursorY - 16, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
                    cursorY -= 24;
                    cols.forEach(col => {
                        if (col.isCenter) {
                            drawCenteredText({ page, text: col.name, centerX: col.x, y: cursorY - 14, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                        }
                        else {
                            page.drawText(col.name, { x: col.x, y: cursorY - 14, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                        }
                    });
                    page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY - 20 }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                    cursorY -= 20;
                }
                if (i % 2 !== 0) {
                    page.drawRectangle({ x: PAGE_MARGIN, y: cursorY - 20, width: PAGE_WIDTH - PAGE_MARGIN * 2, height: 20, color: rgb(0.97, 0.97, 0.97) });
                }
                page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                page.drawLine({ start: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY - 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
                page.drawText(evalRecord.judgeName, { x: col1X, y: cursorY - 14, size: 9, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
                drawCenteredText({ page, text: String(evalRecord.innovation), centerX: cols[1].x, y: cursorY - 14, size: 9, font: fontRegular });
                drawCenteredText({ page, text: String(evalRecord.feasibility), centerX: cols[2].x, y: cursorY - 14, size: 9, font: fontRegular });
                drawCenteredText({ page, text: String(evalRecord.technical), centerX: cols[3].x, y: cursorY - 14, size: 9, font: fontRegular });
                drawCenteredText({ page, text: String(evalRecord.presentation), centerX: cols[4].x, y: cursorY - 14, size: 9, font: fontRegular });
                drawCenteredText({ page, text: String(evalRecord.impact), centerX: cols[5].x, y: cursorY - 14, size: 9, font: fontRegular });
                drawCenteredText({ page, text: String(evalRecord.total), centerX: cols[6].x, y: cursorY - 14, size: 9, font: fontBold });
                cursorY -= 20;
            }
            page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
            avgTotal = team.evaluations.length > 0 ? (avgTotal / team.evaluations.length) : 0;
            page.drawText(`Avg Score: ${avgTotal.toFixed(2)}`, { x: cols[6].x - 60, y: cursorY - 16, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
            cursorY -= 20;
        }
        page.drawLine({ start: { x: PAGE_MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: cursorY }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        cursorY -= 25;
    }
    const pages = pdfDoc.getPages();
    pages.forEach((p, idx) => {
        p.drawLine({ start: { x: PAGE_MARGIN, y: 70 }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: 70 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        p.drawText("Prepared for", { x: PAGE_MARGIN, y: 52, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        p.drawText("Event Administration", { x: PAGE_MARGIN, y: 40, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
        p.drawText(`email: ${adminEmail}`, { x: PAGE_MARGIN, y: 28, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
        const pageText = `Page ${idx + 1} of ${pages.length}`;
        const textWidth = fontRegular.widthOfTextAtSize(pageText, 10);
        p.drawText(pageText, { x: PAGE_WIDTH - PAGE_MARGIN - textWidth, y: 40, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    });
    return Buffer.from(await pdfDoc.save());
};
