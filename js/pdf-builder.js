// Generador de Certificados PDF para Academia BRISEIN LTDA.
// Utiliza pdf-lib, fontkit y qrcode para renderizado vectorial de alta precisión.

class CertificatePdfBuilder {
  /**
   * Meses en español
   */
  static MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  static MONTHS_CAP = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  /**
   * Parsea una fecha en formatos: DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY
   */
  static parseDate(dStr) {
    if (!dStr) return new Date();
    if (dStr instanceof Date) return dStr;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const [y, m, d] = dStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    // DD-MM-YYYY or DD/MM/YYYY
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

  /**
   * Formatea "el día DD de [Mes] de YYYY"
   */
  static formatDayMonthYear(dStr, capitalizeMonth = true) {
    const d = this.parseDate(dStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = capitalizeMonth ? this.MONTHS_CAP[d.getMonth()] : this.MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `el día ${day} de ${month} de ${year}`;
  }

  /**
   * Formatea "En Santiago de Chile, a DD de [mes] de YYYY.-"
   */
  static formatIssueDate(dStr) {
    const d = this.parseDate(dStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = this.MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `En Santiago de Chile, a ${day} de ${month} de ${year}.-`;
  }

  /**
   * Genera el PDF del certificado para un alumno
   * @param {Object} certData - Datos del certificado
   * @returns {Promise<Uint8Array>} Bytes del archivo PDF
   */
  static async buildCertificate(certData) {
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib || (typeof require !== 'undefined' ? require('pdf-lib') : {});
    if (!PDFDocument) {
      throw new Error('pdf-lib no está disponible.');
    }

    const pdfDoc = await PDFDocument.create();
    
    // Registrar fontkit para fuentes personalizadas
    if (window.fontkit && pdfDoc.registerFontkit) {
      pdfDoc.registerFontkit(window.fontkit);
    }

    // Tamaño A4 estándar: 595.28 x 841.89 pt
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Cargar fuentes estándar
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    // Intentar cargar fuente caligráfica para el nombre
    let scriptFont = null;
    try {
      if (typeof ASSETS_DATA !== 'undefined' && ASSETS_DATA.font_script && window.fontkit) {
        const fontB64 = ASSETS_DATA.font_script.split(',')[1];
        const fontBytes = Uint8Array.from(atob(fontB64), c => c.charCodeAt(0));
        scriptFont = await pdfDoc.embedFont(fontBytes);
      }
    } catch (e) {
      console.warn('No se pudo cargar la fuente caligráfica, usando TimesBoldItalic:', e);
    }

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
    const verificationUrl = certData.verificationUrl || `https://brisein.cl/valida/${certData.cleanRut || certData.rut || '123'}`;
    const QRCodeLib = window.QRCode || (typeof require !== 'undefined' ? require('qrcode') : null);
    
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

    // 3. Cargar e incrustar imágenes de assets
    if (typeof ASSETS_DATA !== 'undefined') {
      // Escudo BRISEIN
      if (ASSETS_DATA.logo_shield) {
        const shieldB64 = ASSETS_DATA.logo_shield.split(',')[1];
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

      // Marca de agua NCh 2728 en el centro del fondo
      if (ASSETS_DATA.watermark_nch2728) {
        const wmB64 = ASSETS_DATA.watermark_nch2728.split(',')[1];
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

      // Timbre circular Director Gerente
      if (ASSETS_DATA.stamp_seal) {
        const stampB64 = ASSETS_DATA.stamp_seal.split(',')[1];
        const stampBytes = Uint8Array.from(atob(stampB64), c => c.charCodeAt(0));
        const stamp = await pdfDoc.embedPng(stampBytes);
        page.drawImage(stamp, {
          x: 172,
          y: 80,
          width: 82,
          height: 82
        });
      }

      // Firma
      if (ASSETS_DATA.signature) {
        const sigB64 = ASSETS_DATA.signature.split(',')[1];
        const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
        const signature = await pdfDoc.embedPng(sigBytes);
        page.drawImage(signature, {
          x: 250,
          y: 105,
          width: 125,
          height: 110
        });
      }
    }

    // 4. Encabezados de texto
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

    // 5. Cuerpo del Certificado
    const leftX = 80;
    let currentY = 460;
    const lineHeight = 24;

    const studentName = certData.studentName || 'Nombre del Participante';
    const studentRut = certData.studentRut || '12.345.678-9';
    const courseName = (certData.courseName || 'CURSO DE CAPACITACIÓN').toUpperCase();
    const codeSence = certData.codeSence || certData.codeSenceFormatted || '1238044236';
    const hours = certData.hours || 40;
    const startDateText = this.formatDayMonthYear(certData.startDate, true);
    const endDateText = this.formatDayMonthYear(certData.endDate, true);
    const issueDateText = this.formatIssueDate(certData.issueDate || certData.endDate || new Date());
    const legalNorm = certData.legalNorm || 'Ley Nº 21.659 - Art.46 y Decreto 209 que aprueba Reglamento de Seguridad Privada';

    // Línea 1: "Por cuanto don(a) [Nombre], Rut: [RUT], ha"
    const prefix1 = 'Por cuanto    don(a) ';
    page.drawText(prefix1, { x: leftX, y: currentY, size: 12.5, font: timesItalic });
    let xOffset = leftX + timesItalic.widthOfTextAtSize(prefix1, 12.5) + 6;

    // Nombre Alumno (en fuente caligráfica si está disponible o TimesBoldItalic)
    if (scriptFont) {
      page.drawText(`${studentName},`, {
        x: xOffset,
        y: currentY - 2,
        size: 18,
        font: scriptFont,
        color: rgb(0, 0, 0)
      });
      xOffset += scriptFont.widthOfTextAtSize(`${studentName},`, 18) + 8;
    } else {
      page.drawText(`${studentName},`, {
        x: xOffset,
        y: currentY,
        size: 14,
        font: timesBoldItalic,
        color: rgb(0, 0, 0)
      });
      xOffset += timesBoldItalic.widthOfTextAtSize(`${studentName},`, 14) + 8;
    }

    page.drawText('Rut: ', { x: xOffset, y: currentY, size: 12.5, font: timesItalic });
    xOffset += timesItalic.widthOfTextAtSize('Rut: ', 12.5) + 4;

    page.drawText(`${studentRut}, `, { x: xOffset, y: currentY, size: 13, font: timesBold });
    xOffset += timesBold.widthOfTextAtSize(`${studentRut}, `, 13) + 4;

    page.drawText('ha', { x: xOffset, y: currentY, size: 12.5, font: timesItalic });

    // Línea 2 & 3: Marco Legal
    currentY -= lineHeight;
    if (legalNorm.includes('Decreto 209')) {
      page.drawText('dado cumplimiento a los requisitos impuestos en la Ley Nº 21.659 - Art.46 y', {
        x: leftX, y: currentY, size: 12.5, font: timesItalic
      });
      currentY -= lineHeight;
      page.drawText('Decreto 209 que aprueba Reglamento de Seguridad Privada, para el curso', {
        x: leftX, y: currentY, size: 12.5, font: timesItalic
      });
    } else {
      page.drawText(`dado cumplimiento a los requisitos impuestos para el curso`, {
        x: leftX, y: currentY, size: 12.5, font: timesItalic
      });
    }

    // Línea 4: Nombre del Curso entre comillas y ", entre"
    currentY -= lineHeight;
    const courseFormatted = `“${courseName}”,`;
    page.drawText(courseFormatted, {
      x: leftX,
      y: currentY,
      size: 12.5,
      font: timesBoldItalic
    });
    const cWidth = timesBoldItalic.widthOfTextAtSize(courseFormatted, 12.5);
    page.drawText('entre', {
      x: leftX + cWidth + 10,
      y: currentY,
      size: 12.5,
      font: timesItalic
    });

    // Línea 5: Fechas
    currentY -= lineHeight;
    page.drawText(`${startDateText} y ${endDateText}, con una duración de`, {
      x: leftX,
      y: currentY,
      size: 12.5,
      font: timesItalic
    });

    // Línea 6: Horas
    currentY -= lineHeight;
    page.drawText(`${hours} horas cronológicas.`, {
      x: leftX,
      y: currentY,
      size: 12.5,
      font: timesBold
    });

    // Línea 7: Código SENCE
    currentY -= (lineHeight * 1.6);
    page.drawText(`Cº SENCE : ${codeSence}`, {
      x: leftX,
      y: currentY,
      size: 13,
      font: timesBold
    });

    // Línea 8: Lugar y Fecha de Emisión
    currentY -= (lineHeight * 1.8);
    page.drawText(issueDateText, {
      x: leftX,
      y: currentY,
      size: 12.5,
      font: timesItalic
    });

    // 6. Pie de Firma y Cargo
    page.drawLine({
      start: { x: 250, y: 102 },
      end: { x: 395, y: 102 },
      thickness: 0.75,
      color: rgb(0.3, 0.3, 0.3)
    });

    const sigName = certData.signatoryName || 'Ramón Briceño Rodríguez';
    const sigNameWidth = timesItalic.widthOfTextAtSize(sigName, 9.5);
    page.drawText(sigName, {
      x: 250 + (145 - sigNameWidth) / 2,
      y: 90,
      size: 9.5,
      font: timesItalic,
      color: rgb(0.1, 0.1, 0.1)
    });

    const sigTitle = certData.signatoryTitle || 'Director Gerente';
    const sigTitleWidth = timesItalic.widthOfTextAtSize(sigTitle, 9.5);
    page.drawText(sigTitle, {
      x: 250 + (145 - sigTitleWidth) / 2,
      y: 78,
      size: 9.5,
      font: timesItalic,
      color: rgb(0.1, 0.1, 0.1)
    });

    return await pdfDoc.save();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CertificatePdfBuilder };
}
