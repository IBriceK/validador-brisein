// Generador de Certificados PDF para Academia BRISEIN LTDA.
// Soporta texto justificado tipográfico, decretos y artículos variables, empresas mandantes y formato legal dinámico.

class CertificatePdfBuilder {
  static MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  static MONTHS_CAP = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  static parseDate(dStr) {
    if (!dStr) return new Date();
    if (dStr instanceof Date) return dStr;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const [y, m, d] = dStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(dStr)) {
      const parts = dStr.split(/[-/]/).map(Number);
      const day = parts[0];
      const month = parts[1] - 1;
      let year = parts[2];
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  static formatDayMonthYear(dStr, capitalizeMonth = true) {
    const d = this.parseDate(dStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = capitalizeMonth ? this.MONTHS_CAP[d.getMonth()] : this.MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `el día ${day} de ${month} de ${year}`;
  }

  static formatIssueDate(dStr) {
    const d = this.parseDate(dStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = this.MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `En Santiago de Chile, a ${day} de ${month} de ${year}.-`;
  }

  static renderJustifiedTokens(page, tokens, leftX, startY, lineHeight, maxWidth) {
    const PDFLib = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : (typeof require !== 'undefined' ? require('pdf-lib') : {});
    const rgb = PDFLib.rgb || ((r, g, b) => ({ type: 'RGB', red: r, green: g, blue: b }));

    // 1. Desglosar tokens en palabras
    const words = [];
    for (const token of tokens) {
      const textParts = token.text.split(/(\s+)/);
      for (const part of textParts) {
        if (!part || /^\s+$/.test(part)) continue;
        const width = token.font.widthOfTextAtSize(part, token.size);
        words.push({
          text: part,
          font: token.font,
          size: token.size,
          color: token.color || rgb(0, 0, 0),
          yOffset: token.yOffset || 0,
          width: width
        });
      }
    }

    // 2. Agrupar palabras en líneas que quepan en maxWidth
    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;

    for (const word of words) {
      const standardSpace = word.font.widthOfTextAtSize(' ', word.size);
      const needed = currentLine.length === 0 ? word.width : currentLineWidth + standardSpace + word.width;

      if (needed <= maxWidth) {
        currentLine.push(word);
        currentLineWidth = needed;
      } else {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [word];
        currentLineWidth = word.width;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    // 3. Dibujar líneas con justificado exacto
    let currentY = startY;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLastLine = (i === lines.length - 1);

      if (isLastLine || line.length <= 1) {
        // Última línea o palabra única: espaciado natural a la izquierda
        let xOffset = leftX;
        for (const w of line) {
          page.drawText(w.text, {
            x: xOffset,
            y: currentY + w.yOffset,
            size: w.size,
            font: w.font,
            color: w.color
          });
          xOffset += w.width + w.font.widthOfTextAtSize(' ', w.size);
        }
      } else {
        // Línea intermedia: Justificado tipográfico proporcional
        const totalWordsWidth = line.reduce((sum, w) => sum + w.width, 0);
        const spaceWidth = (maxWidth - totalWordsWidth) / (line.length - 1);

        let xOffset = leftX;
        for (const w of line) {
          page.drawText(w.text, {
            x: xOffset,
            y: currentY + w.yOffset,
            size: w.size,
            font: w.font,
            color: w.color
          });
          xOffset += w.width + spaceWidth;
        }
      }
      currentY -= lineHeight;
    }
    return currentY;
  }

  /**
   * Genera el PDF del certificado para un alumno
   * @param {Object} certData - Datos del certificado
   * @returns {Promise<Uint8Array>} Bytes del archivo PDF
   */
  static async buildCertificate(certData) {
    const PDFLib = (typeof window !== 'undefined' && window.PDFLib) ? window.PDFLib : (typeof require !== 'undefined' ? require('pdf-lib') : {});
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    if (!PDFDocument) {
      throw new Error('pdf-lib no está disponible.');
    }

    const pdfDoc = await PDFDocument.create();
    
    // Registrar fontkit si está presente
    const fontkitLib = (typeof window !== 'undefined' && window.fontkit) ? window.fontkit : (typeof require !== 'undefined' ? require('@pdf-lib/fontkit') : null);
    if (fontkitLib && pdfDoc.registerFontkit) {
      pdfDoc.registerFontkit(fontkitLib);
    }

    // Tamaño A4 estándar: 595.28 x 841.89 pt
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Cargar fuentes estándar
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    // Fuente caligráfica para el nombre
    let scriptFont = null;
    try {
      const assetsObj = (typeof window !== 'undefined' && window.ASSETS_DATA) ? window.ASSETS_DATA : (typeof globalThis !== 'undefined' && globalThis.ASSETS_DATA ? globalThis.ASSETS_DATA : (typeof ASSETS_DATA !== 'undefined' ? ASSETS_DATA : null));
      if (assetsObj && assetsObj.font_script && fontkitLib) {
        const fontB64 = assetsObj.font_script.split(',')[1];
        const fontBytes = Uint8Array.from(atob(fontB64), c => c.charCodeAt(0));
        scriptFont = await pdfDoc.embedFont(fontBytes);
      }
    } catch (e) {}

    // 1. Barra vertical roja izquierda
    const redColor = rgb(0.85, 0.05, 0.05); // #D90D0D
    page.drawRectangle({
      x: 35.5,
      y: 30,
      width: 27.5,
      height: 660,
      color: redColor
    });

    // 2. Código QR en la esquina superior izquierda
    const verificationUrl = certData.verificationUrl || `https://valida.empresasbrisein.com/?c=demo`;
    const QRCodeLib = (typeof window !== 'undefined' && window.QRCode) ? window.QRCode : (typeof require !== 'undefined' ? require('qrcode') : null);
    
    if (QRCodeLib) {
      let qrDataUrl = '';
      if (QRCodeLib.toDataURL) {
        qrDataUrl = await QRCodeLib.toDataURL(verificationUrl, {
          margin: 0,
          width: 200,
          errorCorrectionLevel: 'M'
        });
      }
      if (qrDataUrl) {
        const qrB64 = qrDataUrl.split(',')[1];
        const qrBytes = Uint8Array.from(atob(qrB64), c => c.charCodeAt(0));
        const qrImage = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImage, {
          x: 34,
          y: 715,
          width: 72,
          height: 72
        });
      }
    }

    // 3. Imágenes de Assets (Escudo, Marca de agua, Timbre Grande, Firma Grande)
    const assetsObj = (typeof window !== 'undefined' && window.ASSETS_DATA) ? window.ASSETS_DATA : (typeof globalThis !== 'undefined' && globalThis.ASSETS_DATA ? globalThis.ASSETS_DATA : (typeof ASSETS_DATA !== 'undefined' ? ASSETS_DATA : null));
    if (assetsObj) {
      if (assetsObj.logo_shield) {
        const shieldB64 = assetsObj.logo_shield.split(',')[1];
        const shieldBytes = Uint8Array.from(atob(shieldB64), c => c.charCodeAt(0));
        const logoShield = await pdfDoc.embedPng(shieldBytes);
        const shieldDims = logoShield.scale(0.32);
        page.drawImage(logoShield, {
          x: (width - shieldDims.width) / 2 + 8,
          y: 665,
          width: shieldDims.width,
          height: shieldDims.height
        });
      }

      if (assetsObj.watermark_nch2728) {
        const wmB64 = assetsObj.watermark_nch2728.split(',')[1];
        const wmBytes = Uint8Array.from(atob(wmB64), c => c.charCodeAt(0));
        const watermark = await pdfDoc.embedPng(wmBytes);
        const wmDims = watermark.scale(0.68);
        page.drawImage(watermark, {
          x: (width - wmDims.width) / 2 + 10,
          y: 260,
          width: wmDims.width,
          height: wmDims.height,
          opacity: 0.18
        });
      }

      // Timbre Oficial Grande
      if (assetsObj.stamp_seal) {
        const stampB64 = assetsObj.stamp_seal.split(',')[1];
        const stampBytes = Uint8Array.from(atob(stampB64), c => c.charCodeAt(0));
        const stamp = await pdfDoc.embedPng(stampBytes);
        page.drawImage(stamp, {
          x: 135,
          y: 50,
          width: 125,
          height: 125
        });
      }

      // Firma Oficial Ramón Briceño Grande
      if (assetsObj.signature) {
        const sigB64 = assetsObj.signature.split(',')[1];
        const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
        const signature = await pdfDoc.embedPng(sigBytes);
        page.drawImage(signature, {
          x: 270,
          y: 75,
          width: 220,
          height: 180
        });
      }
    }

    // 4. Encabezados Institucionales
    const title1 = 'ACADEMIA BRISEIN LTDA.';
    const title1Width = timesBold.widthOfTextAtSize(title1, 20);
    page.drawText(title1, {
      x: (width - title1Width) / 2 + 10,
      y: 608,
      size: 20,
      font: timesBold,
      color: rgb(0, 0, 0)
    });

    const sub1 = 'Empresa Asesora y Capacitadora en';
    const sub1Width = timesBoldItalic.widthOfTextAtSize(sub1, 14);
    page.drawText(sub1, {
      x: (width - sub1Width) / 2 + 10,
      y: 578,
      size: 14,
      font: timesBoldItalic,
      color: rgb(0, 0, 0)
    });

    const sub2 = 'Materias de Seguridad Privada';
    const sub2Width = timesBoldItalic.widthOfTextAtSize(sub2, 14);
    page.drawText(sub2, {
      x: (width - sub2Width) / 2 + 10,
      y: 558,
      size: 14,
      font: timesBoldItalic,
      color: rgb(0, 0, 0)
    });

    // 5. Renderizado de Párrafo Justificado
    const leftX = 80;
    const maxContentWidth = 475;
    const startY = 472;
    const lineHeight = 21.5;

    const studentName = certData.studentName || 'Nombre del Participante';
    const studentRut = certData.studentRut || '12.345.678-9';
    const courseName = (certData.courseName || 'CURSO DE CAPACITACIÓN').toUpperCase();
    const codeSence = certData.codeSence || certData.codeSenceFormatted || '1238044236';
    const hours = certData.hours || 40;
    const startDateText = this.formatDayMonthYear(certData.startDate, true);
    const endDateText = this.formatDayMonthYear(certData.endDate, true);
    const issueDateText = this.formatIssueDate(certData.issueDate || new Date());
    const companyName = (certData.companyName || '').trim();
    const companyRut = (certData.companyRut || '').trim();
    const legalNorm = certData.legalNorm || 'Ley Nº 21.659 sobre Seguridad Privada y el Art.113 del Reglamento contenido en el Dº209 de la Subsecretaría de Prevención del Delito - S.P.D.';
    let locationText = (certData.locationText || '').trim();
    if (locationText.endsWith('.')) {
      locationText = locationText.slice(0, -1);
    }

    const tokens = [];

    if (companyName) {
      tokens.push(
        { text: 'La ACADEMIA BRISEIN LTDA., procede a CERTIFICAR, que el funcionario de la empresa', font: timesItalic, size: 11.5 },
        { text: `${companyName.toUpperCase()}${companyRut ? ', RUT ' + companyRut : ''},`, font: timesBoldItalic, size: 11.5 },
        { text: 'don(a)', font: timesItalic, size: 11.5 }
      );
      if (scriptFont) {
        tokens.push({ text: `${studentName},`, font: scriptFont, size: 16, yOffset: -2 });
      } else {
        tokens.push({ text: `${studentName},`, font: timesBoldItalic, size: 12.5 });
      }
      tokens.push(
        { text: `RUT: ${studentRut}, realizó el curso sobre`, font: timesItalic, size: 11.5 },
        { text: `“${courseName}”,`, font: timesBoldItalic, size: 12 },
        { text: `conforme a la ${legalNorm},`, font: timesItalic, size: 11.5 },
        { text: `entre ${startDateText} y ${endDateText}, con una duración de`, font: timesItalic, size: 11.5 },
        { text: `${hours} horas cronológicas${locationText ? ', ' + locationText : ''}.`, font: timesItalic, size: 11.5 }
      );
    } else {
      tokens.push(
        { text: 'Por cuanto don(a)', font: timesItalic, size: 12 }
      );
      if (scriptFont) {
        tokens.push({ text: `${studentName},`, font: scriptFont, size: 18, yOffset: -2 });
      } else {
        tokens.push({ text: `${studentName},`, font: timesBoldItalic, size: 13.5 });
      }
      tokens.push(
        { text: 'Rut:', font: timesItalic, size: 12 },
        { text: `${studentRut},`, font: timesBold, size: 12.5 },
        { text: 'ha dado cumplimiento a los requisitos impuestos en la normativa para el curso', font: timesItalic, size: 12 },
        { text: `“${courseName}”,`, font: timesBoldItalic, size: 12 },
        { text: `conforme a la ${legalNorm},`, font: timesItalic, size: 11.5 },
        { text: `entre ${startDateText} y ${endDateText}, con una duración de`, font: timesItalic, size: 11.5 },
        { text: `${hours} horas cronológicas${locationText ? ', ' + locationText : ''}.`, font: timesItalic, size: 11.5 }
      );
    }

    // Renderizar Párrafo Justificado
    let endY = this.renderJustifiedTokens(page, tokens, leftX, startY, lineHeight, maxContentWidth);

    // Código SENCE
    endY -= (lineHeight * 0.8);
    page.drawText(`Cº SENCE : ${codeSence}`, {
      x: leftX, y: endY, size: 12.5, font: timesBold
    });

    // Fecha de Emisión
    endY -= (lineHeight * 1.2);
    page.drawText(issueDateText, {
      x: leftX, y: endY, size: 11.5, font: timesItalic
    });

    // 6. Pie de Firma y Cargo (Línea elegante)
    const sigLineStartX = 285;
    const sigLineWidth = 190;
    page.drawLine({
      start: { x: sigLineStartX, y: 92 },
      end: { x: sigLineStartX + sigLineWidth, y: 92 },
      thickness: 0.8,
      color: rgb(0.2, 0.2, 0.2)
    });

    const sigName = certData.signatoryName || 'Ramón Briceño Rodríguez';
    const sigNameWidth = timesItalic.widthOfTextAtSize(sigName, 10.5);
    page.drawText(sigName, {
      x: sigLineStartX + (sigLineWidth - sigNameWidth) / 2,
      y: 78,
      size: 10.5,
      font: timesItalic,
      color: rgb(0.1, 0.1, 0.1)
    });

    const sigTitle = certData.signatoryTitle || 'Director Gerente';
    const sigTitleWidth = timesItalic.widthOfTextAtSize(sigTitle, 10);
    page.drawText(sigTitle, {
      x: sigLineStartX + (sigLineWidth - sigTitleWidth) / 2,
      y: 65,
      size: 10,
      font: timesItalic,
      color: rgb(0.1, 0.1, 0.1)
    });

    return await pdfDoc.save();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CertificatePdfBuilder };
}
