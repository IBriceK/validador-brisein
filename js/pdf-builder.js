// Generador de Certificados PDF para Academia BRISEIN LTDA.
// Soporta decretos y artículos variables, empresas mandantes y formato legal dinámico.

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

  static wrapWords(text, font, fontSize, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
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
      const assetsObj = (typeof ASSETS_DATA !== 'undefined') ? ASSETS_DATA : (typeof global !== 'undefined' && global.ASSETS_DATA ? global.ASSETS_DATA : null);
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
    const assetsObj = (typeof ASSETS_DATA !== 'undefined') ? ASSETS_DATA : (typeof global !== 'undefined' && global.ASSETS_DATA ? global.ASSETS_DATA : null);
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

      // Timbre Oficial (Agrandado para presencia destacada)
      if (assetsObj.stamp_seal) {
        const stampB64 = assetsObj.stamp_seal.split(',')[1];
        const stampBytes = Uint8Array.from(atob(stampB64), c => c.charCodeAt(0));
        const stamp = await pdfDoc.embedPng(stampBytes);
        page.drawImage(stamp, {
          x: 155,
          y: 65,
          width: 108,
          height: 108
        });
      }

      // Firma Oficial Ramón Briceño (Agrandada con proporción elegante)
      if (assetsObj.signature) {
        const sigB64 = assetsObj.signature.split(',')[1];
        const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
        const signature = await pdfDoc.embedPng(sigBytes);
        page.drawImage(signature, {
          x: 290,
          y: 88,
          width: 165,
          height: 145
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

    // 5. Cuerpo del Certificado (Dinámico)
    const leftX = 80;
    const maxContentWidth = 475;
    let currentY = 470;
    const lineHeight = 20.5;

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
    const legalNorm = certData.legalNorm || 'Ley Nº 21.659 - Art.46 y Decreto 209 que aprueba Reglamento de Seguridad Privada';
    let locationText = (certData.locationText || '').trim();
    if (locationText.endsWith('.')) {
      locationText = locationText.slice(0, -1);
    }

    // Si viene con empresa (ej: TRANSPORTES TRANSRUT LIMITADA)
    if (companyName) {
      page.drawText('La ACADEMIA BRISEIN LTDA., procede a CERTIFICAR, que el funcionario', {
        x: leftX, y: currentY, size: 11.5, font: timesItalic
      });
      currentY -= lineHeight;
      page.drawText(`de la empresa ${companyName.toUpperCase()}${companyRut ? ', RUT ' + companyRut : ''},`, {
        x: leftX, y: currentY, size: 11.5, font: timesBoldItalic
      });
      currentY -= lineHeight;
      
      const donPrefix = 'don(a) ';
      page.drawText(donPrefix, { x: leftX, y: currentY, size: 11.5, font: timesItalic });
      let xOffset = leftX + timesItalic.widthOfTextAtSize(donPrefix, 11.5) + 4;
      
      if (scriptFont) {
        page.drawText(`${studentName},`, { x: xOffset, y: currentY - 2, size: 17, font: scriptFont });
        xOffset += scriptFont.widthOfTextAtSize(`${studentName},`, 17) + 6;
      } else {
        page.drawText(`${studentName},`, { x: xOffset, y: currentY, size: 13.5, font: timesBoldItalic });
        xOffset += timesBoldItalic.widthOfTextAtSize(`${studentName},`, 13.5) + 6;
      }
      page.drawText(`RUT: ${studentRut}, realizó el curso sobre`, { x: xOffset, y: currentY, size: 11.5, font: timesItalic });
    } else {
      // Formato estándar
      const prefix1 = 'Por cuanto    don(a) ';
      page.drawText(prefix1, { x: leftX, y: currentY, size: 12, font: timesItalic });
      let xOffset = leftX + timesItalic.widthOfTextAtSize(prefix1, 12) + 6;

      if (scriptFont) {
        page.drawText(`${studentName},`, { x: xOffset, y: currentY - 2, size: 18, font: scriptFont });
        xOffset += scriptFont.widthOfTextAtSize(`${studentName},`, 18) + 8;
      } else {
        page.drawText(`${studentName},`, { x: xOffset, y: currentY, size: 14, font: timesBoldItalic });
        xOffset += timesBoldItalic.widthOfTextAtSize(`${studentName},`, 14) + 8;
      }

      page.drawText('Rut: ', { x: xOffset, y: currentY, size: 12, font: timesItalic });
      xOffset += timesItalic.widthOfTextAtSize('Rut: ', 12) + 4;

      page.drawText(`${studentRut}, `, { x: xOffset, y: currentY, size: 12.5, font: timesBold });
      xOffset += timesBold.widthOfTextAtSize(`${studentRut}, `, 12.5) + 4;

      page.drawText('ha', { x: xOffset, y: currentY, size: 12, font: timesItalic });
      currentY -= lineHeight;
      page.drawText('dado cumplimiento a los requisitos impuestos en la normativa para el curso', {
        x: leftX, y: currentY, size: 12, font: timesItalic
      });
    }

    // Nombre del Curso
    currentY -= lineHeight;
    const courseLines = this.wrapWords(`“${courseName}”,`, timesBoldItalic, 12, maxContentWidth);
    for (const cLine of courseLines) {
      page.drawText(cLine, { x: leftX, y: currentY, size: 12, font: timesBoldItalic });
      currentY -= (lineHeight * 0.95);
    }

    // Normativa / Artículos y Decretos
    const legalIntro = `conforme a la ${legalNorm}`;
    const legalLines = this.wrapWords(legalIntro, timesItalic, 11.5, maxContentWidth);
    for (const line of legalLines) {
      page.drawText(line, { x: leftX, y: currentY, size: 11.5, font: timesItalic });
      currentY -= (lineHeight * 0.95);
    }

    // Fechas, Duración y Lugar (Envoltorio inteligente)
    const datesAndDuration = `entre ${startDateText} y ${endDateText}, con una duración de ${hours} horas cronológicas${locationText ? ', ' + locationText : ''}.`;
    const durLines = this.wrapWords(datesAndDuration, timesItalic, 11.5, maxContentWidth);
    for (const dLine of durLines) {
      page.drawText(dLine, { x: leftX, y: currentY, size: 11.5, font: timesItalic });
      currentY -= (lineHeight * 0.95);
    }

    // Código SENCE
    currentY -= (lineHeight * 1.2);
    page.drawText(`Cº SENCE : ${codeSence}`, {
      x: leftX, y: currentY, size: 12.5, font: timesBold
    });

    // Fecha de Emisión
    currentY -= (lineHeight * 1.3);
    page.drawText(issueDateText, {
      x: leftX, y: currentY, size: 11.5, font: timesItalic
    });

    // 6. Pie de Firma y Cargo (Línea elegante centrada sobre la firma)
    const sigLineStartX = 280;
    const sigLineWidth = 180;
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
