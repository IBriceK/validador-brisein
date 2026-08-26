// Aplicación Principal del Generador de Certificados de Academia BRISEIN LTDA.
// Generador privado / local sin datos de prueba precargados, con soporte de decretos y empresas dinámicas.

document.addEventListener('DOMContentLoaded', () => {
  // Inyectar imágenes Base64 en el DOM para permitir exportación PNG 100% segura bajo file://
  if (typeof ASSETS_DATA !== 'undefined') {
    const shieldEl = document.getElementById('prev-logo-shield');
    if (shieldEl && ASSETS_DATA.logo_shield) shieldEl.src = ASSETS_DATA.logo_shield;
    
    const navShieldEl = document.getElementById('nav-logo-shield');
    if (navShieldEl && ASSETS_DATA.logo_shield) navShieldEl.src = ASSETS_DATA.logo_shield;

    const wmEl = document.getElementById('prev-watermark');
    if (wmEl && ASSETS_DATA.watermark_nch2728) wmEl.src = ASSETS_DATA.watermark_nch2728;

    const stampEl = document.getElementById('prev-stamp-seal');
    if (stampEl && ASSETS_DATA.stamp_seal) stampEl.src = ASSETS_DATA.stamp_seal;

    const sigEl = document.getElementById('prev-signature');
    if (sigEl && ASSETS_DATA.signature) sigEl.src = ASSETS_DATA.signature;
  }

  // Fecha actual por defecto
  const today = new Date();
  const todayFormatted = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  // Estado Global Limpio
  const state = {
    mode: 'otic', // 'otic' | 'manual'
    courseName: '',
    codeSence: '',
    codeSenceFormatted: '',
    hours: '',
    startDate: '',
    endDate: '',
    issueDate: todayFormatted,
    legalNorm: 'Ley Nº 21.659 sobre Seguridad Privada y el Art.113 del Reglamento contenido en el Dº209 de la Subsecretaría de Prevención del Delito - S.P.D.',
    companyName: '',
    companyRut: '',
    locationText: '',
    signatoryName: 'Ramón Briceño Rodríguez',
    signatoryTitle: 'Director Gerente',
    baseUrl: 'https://valida.empresasbrisein.com',
    students: [],
    currentIndex: 0
  };

  // Cargar configuraciones guardadas
  try {
    const savedBaseUrl = localStorage.getItem('brisein_base_url');
    if (savedBaseUrl) state.baseUrl = savedBaseUrl;
    const savedSigName = localStorage.getItem('brisein_sig_name');
    if (savedSigName) state.signatoryName = savedSigName;
    const savedSigTitle = localStorage.getItem('brisein_sig_title');
    if (savedSigTitle) state.signatoryTitle = savedSigTitle;
  } catch (e) {}

  // 1. Inicializar Select de Cursos
  const selectCourse = document.getElementById('select-course');
  if (typeof COURSES_CATALOG !== 'undefined') {
    selectCourse.innerHTML = '<option value="">-- Seleccionar Curso Oficial SENCE --</option>' + 
      COURSES_CATALOG.map(c => `
        <option value="${c.id}">${c.name} (${c.hours}h - Cód: ${c.codeSenceFormatted || c.codeSence})</option>
      `).join('') + '<option value="custom">+ Ingresar Curso Personalizado...</option>';
  }

  // 2. Elementos del DOM
  const tabModeOtic = document.getElementById('tab-mode-otic');
  const tabModeManual = document.getElementById('tab-mode-manual');
  const sectionOtic = document.getElementById('section-otic');
  const sectionManual = document.getElementById('section-manual');
  const dropZone = document.getElementById('drop-zone');
  const fileInputOtic = document.getElementById('file-input-otic');
  const oticFileStatus = document.getElementById('otic-file-status');
  const loadedFileName = document.getElementById('loaded-file-name');
  const loadedFileInfo = document.getElementById('loaded-file-info');
  const btnClearOtic = document.getElementById('btn-clear-otic');

  const inputCourseName = document.getElementById('input-course-name');
  const inputLegalNorm = document.getElementById('input-legal-norm');
  const inputCompanyName = document.getElementById('input-company-name');
  const inputCompanyRut = document.getElementById('input-company-rut');
  const selectLocationTemplate = document.getElementById('select-location-template');
  const inputLocation = document.getElementById('input-location');
  const inputCodeSence = document.getElementById('input-code-sence');
  const inputHours = document.getElementById('input-hours');
  const inputStartDate = document.getElementById('input-start-date');
  const inputEndDate = document.getElementById('input-end-date');
  const inputIssueDate = document.getElementById('input-issue-date');

  // Inicializar fecha de hoy en el input
  inputIssueDate.value = todayFormatted;

  const textareaManualStudents = document.getElementById('textarea-manual-students');
  const btnParseManualText = document.getElementById('btn-parse-manual-text');
  const btnAddSingleStudent = document.getElementById('btn-add-single-student');
  const btnClearAllStudents = document.getElementById('btn-clear-all-students');
  const studentsTableBody = document.getElementById('students-table-body');
  const studentsCount = document.getElementById('students-count');

  const btnPrevStudent = document.getElementById('btn-prev-student');
  const btnNextStudent = document.getElementById('btn-next-student');
  const previewIndexLabel = document.getElementById('preview-index-label');

  const btnGenerateAllZip = document.getElementById('btn-generate-all-zip');
  const btnDownloadCurrentPdf = document.getElementById('btn-download-current-pdf');
  const btnDownloadCurrentPng = document.getElementById('btn-download-current-png');
  const btnPrintCurrent = document.getElementById('btn-print-current');

  const btnShowSettings = document.getElementById('btn-show-settings');
  const modalSettings = document.getElementById('modal-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingBaseUrl = document.getElementById('setting-base-url');
  const settingSignatoryName = document.getElementById('setting-signatory-name');
  const settingSignatoryTitle = document.getElementById('setting-signatory-title');

  // 3. Manejo de Pestañas
  tabModeOtic.addEventListener('click', () => {
    state.mode = 'otic';
    tabModeOtic.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-200 bg-brisein-red text-white shadow-md';
    tabModeManual.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/60';
    sectionOtic.classList.remove('hidden');
    sectionManual.classList.add('hidden');
  });

  tabModeManual.addEventListener('click', () => {
    state.mode = 'manual';
    tabModeManual.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-200 bg-brisein-red text-white shadow-md';
    tabModeOtic.className = 'flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/60';
    sectionManual.classList.remove('hidden');
    sectionOtic.classList.add('hidden');
  });

  // 4. Selección de Curso en Modo Manual
  selectCourse.addEventListener('change', (e) => {
    const courseId = e.target.value;
    if (!courseId) return;
    if (courseId === 'custom') {
      inputCourseName.focus();
      return;
    }
    const found = COURSES_CATALOG.find(c => c.id === courseId);
    if (found) {
      state.courseName = found.name;
      state.codeSence = found.codeSence;
      state.codeSenceFormatted = found.codeSenceFormatted || found.codeSence;
      state.hours = found.hours;
      if (found.normativa) {
        state.legalNorm = found.normativa;
        inputLegalNorm.value = found.normativa;
      }
      
      inputCourseName.value = found.name;
      inputCodeSence.value = found.codeSenceFormatted || found.codeSence;
      inputHours.value = found.hours;
      
      updatePreview();
    }
  });

  // 5. Carga y Procesamiento de PDF OTIC (Drag & Drop)
  fileInputOtic.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleOticFile(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-red-500', 'bg-slate-900');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-red-500', 'bg-slate-900');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-red-500', 'bg-slate-900');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleOticFile(e.dataTransfer.files[0]);
    }
  });

  btnClearOtic.addEventListener('click', () => {
    oticFileStatus.classList.add('hidden');
    dropZone.classList.remove('hidden');
    fileInputOtic.value = '';
    state.students = [];
    state.courseName = '';
    state.codeSence = '';
    state.codeSenceFormatted = '';
    state.hours = '';
    state.startDate = '';
    state.endDate = '';
    state.issueDate = todayFormatted;
    state.companyName = '';
    state.companyRut = '';
    state.locationText = '';
    inputCourseName.value = '';
    inputCodeSence.value = '';
    inputHours.value = '';
    inputStartDate.value = '';
    inputEndDate.value = '';
    inputIssueDate.value = todayFormatted;
    inputCompanyName.value = '';
    inputCompanyRut.value = '';
    inputLocation.value = '';
    selectLocationTemplate.value = '';
    renderStudentsTable();
    updatePreview();
  });

  async function handleOticFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo PDF válido de Orden de Compra OTIC.');
      return;
    }

    dropZone.classList.add('opacity-50');
    try {
      const { fullText } = await OticParser.extractPdfText(file);
      const parsed = OticParser.parseOticPdfText(fullText);

      if (parsed.courseName) {
        state.courseName = parsed.courseName;
        inputCourseName.value = parsed.courseName;
      }
      if (parsed.codeSenceFormatted || parsed.codeSence) {
        state.codeSence = parsed.codeSence;
        state.codeSenceFormatted = parsed.codeSenceFormatted || parsed.codeSence;
        inputCodeSence.value = state.codeSence;
      }
      if (parsed.hours) {
        state.hours = parsed.hours;
        inputHours.value = parsed.hours;
      }
      if (parsed.startDate) {
        state.startDate = parsed.startDate;
        inputStartDate.value = parsed.startDate;
      }
      if (parsed.endDate) {
        state.endDate = parsed.endDate;
        inputEndDate.value = parsed.endDate;
      }
      if (parsed.matchedCourse && parsed.matchedCourse.normativa) {
        state.legalNorm = parsed.matchedCourse.normativa;
        inputLegalNorm.value = parsed.matchedCourse.normativa;
      }

      if (parsed.participants && parsed.participants.length > 0) {
        state.students = parsed.participants;
        state.currentIndex = 0;
      }

      loadedFileName.textContent = file.name;
      loadedFileInfo.textContent = `${parsed.participants.length} alumnos detectados • ${parsed.courseName || 'Curso detectado'}`;
      dropZone.classList.add('hidden');
      oticFileStatus.classList.remove('hidden');

      renderStudentsTable();
      updatePreview();
    } catch (err) {
      alert('Error al leer el archivo PDF: ' + err.message);
    } finally {
      dropZone.classList.remove('opacity-50');
    }
  }

  // 6. Manejo de Plantillas de Sede
  selectLocationTemplate.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'none') {
      inputLocation.value = '';
      state.locationText = '';
    } else if (val) {
      inputLocation.value = val;
      state.locationText = val;
    }
    updatePreview();
  });

  // 7. Carga Manual de Texto Pegado
  btnParseManualText.addEventListener('click', () => {
    const raw = textareaManualStudents.value.trim();
    if (!raw) {
      alert('Pega primero una lista de alumnos en el cuadro de texto.');
      return;
    }
    const parsed = OticParser.parseManualText(raw);
    if (parsed.length > 0) {
      state.students = [...state.students, ...parsed];
      textareaManualStudents.value = '';
      renderStudentsTable();
      updatePreview();
    } else {
      alert('No se pudieron detectar alumnos en el texto ingresado.');
    }
  });

  btnAddSingleStudent.addEventListener('click', () => {
    const newStudent = {
      id: `std_${Date.now()}`,
      rut: '',
      cleanRut: '',
      name: ''
    };
    state.students.push(newStudent);
    state.currentIndex = state.students.length - 1;
    renderStudentsTable();
    updatePreview();
  });

  if (btnClearAllStudents) {
    btnClearAllStudents.addEventListener('click', () => {
      if (state.students.length === 0) return;
      if (confirm('¿Deseas vaciar la lista de alumnos?')) {
        state.students = [];
        state.currentIndex = 0;
        renderStudentsTable();
        updatePreview();
      }
    });
  }

  // 8. Renderizado de la Tabla de Alumnos
  function renderStudentsTable() {
    studentsCount.textContent = state.students.length;
    previewIndexLabel.textContent = state.students.length > 0 ? `${state.currentIndex + 1} / ${state.students.length}` : '0 / 0';

    if (state.students.length === 0) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-slate-500">
            <i class="fa-solid fa-user-slash text-2xl text-slate-600 mb-2 block"></i>
            Lista vacía. Desliza una orden OTIC o agrega alumnos manualmente para comenzar.
          </td>
        </tr>
      `;
      return;
    }

    studentsTableBody.innerHTML = state.students.map((std, idx) => `
      <tr class="hover:bg-slate-800/50 transition cursor-pointer ${idx === state.currentIndex ? 'bg-red-950/40 border-l-2 border-red-500' : ''}" data-index="${idx}">
        <td class="py-2.5 px-3 font-mono text-slate-500">${idx + 1}</td>
        <td class="py-2.5 px-3 font-mono font-medium text-slate-200">
          <input type="text" placeholder="12.345.678-9" class="bg-transparent hover:bg-slate-800/80 focus:bg-slate-900 border border-transparent focus:border-slate-700 rounded px-1.5 py-0.5 w-28 text-xs text-slate-200 focus:outline-none student-rut-input" data-index="${idx}" value="${std.rut || ''}">
        </td>
        <td class="py-2.5 px-3 font-semibold text-white">
          <input type="text" placeholder="Nombre completo" class="bg-transparent hover:bg-slate-800/80 focus:bg-slate-900 border border-transparent focus:border-slate-700 rounded px-1.5 py-0.5 w-full text-xs text-white focus:outline-none student-name-input" data-index="${idx}" value="${std.name || ''}">
        </td>
        <td class="py-2.5 px-3 text-center space-x-1">
          <button class="p-1 text-slate-400 hover:text-red-400 transition btn-delete-student" data-index="${idx}" title="Eliminar alumno">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </td>
      </tr>
    `).join('');

    studentsTableBody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
        const idx = parseInt(row.getAttribute('data-index'), 10);
        state.currentIndex = idx;
        renderStudentsTable();
        updatePreview();
      });
    });

    studentsTableBody.querySelectorAll('.student-rut-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        const val = e.target.value.trim();
        state.students[idx].rut = OticParser.formatRut(val);
        state.students[idx].cleanRut = OticParser.cleanRut(val);
        e.target.value = state.students[idx].rut;
        updatePreview();
      });
    });

    studentsTableBody.querySelectorAll('.student-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        state.students[idx].name = OticParser.formatName(e.target.value.trim());
        e.target.value = state.students[idx].name;
        updatePreview();
      });
    });

    studentsTableBody.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        state.students.splice(idx, 1);
        if (state.currentIndex >= state.students.length) {
          state.currentIndex = Math.max(0, state.students.length - 1);
        }
        renderStudentsTable();
        updatePreview();
      });
    });
  }

  // 9. Eventos de Entrada en Parámetros
  inputCourseName.addEventListener('input', (e) => {
    state.courseName = e.target.value;
    updatePreview();
  });
  inputLegalNorm.addEventListener('input', (e) => {
    state.legalNorm = e.target.value;
    updatePreview();
  });
  inputCompanyName.addEventListener('input', (e) => {
    state.companyName = e.target.value;
    updatePreview();
  });
  inputCompanyRut.addEventListener('input', (e) => {
    state.companyRut = e.target.value;
    updatePreview();
  });
  inputLocation.addEventListener('input', (e) => {
    state.locationText = e.target.value;
    updatePreview();
  });
  inputCodeSence.addEventListener('input', (e) => {
    state.codeSence = e.target.value;
    state.codeSenceFormatted = e.target.value;
    updatePreview();
  });
  inputHours.addEventListener('input', (e) => {
    state.hours = parseInt(e.target.value, 10) || 0;
    updatePreview();
  });
  inputStartDate.addEventListener('input', (e) => {
    state.startDate = e.target.value;
    updatePreview();
  });
  inputEndDate.addEventListener('input', (e) => {
    state.endDate = e.target.value;
    updatePreview();
  });
  inputIssueDate.addEventListener('input', (e) => {
    state.issueDate = e.target.value;
    updatePreview();
  });

  // Navegación entre alumnos para preview
  btnPrevStudent.addEventListener('click', () => {
    if (state.students.length === 0) return;
    state.currentIndex = (state.currentIndex - 1 + state.students.length) % state.students.length;
    renderStudentsTable();
    updatePreview();
  });

  btnNextStudent.addEventListener('click', () => {
    if (state.students.length === 0) return;
    state.currentIndex = (state.currentIndex + 1) % state.students.length;
    renderStudentsTable();
    updatePreview();
  });

  // 10. Actualización de Vista Previa en Vivo
  function updatePreview() {
    const currentStudent = state.students[state.currentIndex] || {
      name: 'Nombre del Participante',
      rut: '12.345.678-9',
      cleanRut: '123456789'
    };

    const sName = currentStudent.name || 'Nombre del Participante';
    const sRut = currentStudent.rut || '12.345.678-9';
    const cName = (state.courseName || 'NOMBRE DEL CURSO').toUpperCase();
    const startText = state.startDate ? CertificatePdfBuilder.formatDayMonthYear(state.startDate, true) : 'el día [Fecha Inicio]';
    const endText = state.endDate ? CertificatePdfBuilder.formatDayMonthYear(state.endDate, true) : 'el día [Fecha Término]';
    const normText = state.legalNorm || 'Ley Nº 21.659 sobre Seguridad Privada y el Art.113 del Reglamento contenido en el Dº209 de la Subsecretaría de Prevención del Delito - S.P.D.';
    const compName = (state.companyName || '').trim();
    const compRut = (state.companyRut || '').trim();
    
    let locText = (state.locationText || '').trim();
    if (locText.endsWith('.')) {
      locText = locText.slice(0, -1);
    }

    let paragraphHtml = '';
    if (compName) {
      paragraphHtml = `
        La ACADEMIA BRISEIN LTDA., procede a CERTIFICAR, que el funcionario de la empresa 
        <strong class="font-bold uppercase">${compName}</strong>${compRut ? ', RUT <strong class="font-bold">' + compRut + '</strong>' : ''}, 
        don(a) <span class="cert-font-script font-bold text-[1.25em] text-black not-italic inline leading-none align-baseline px-0.5" style="line-height: 1; vertical-align: baseline;">${sName}</span>, 
        RUT: <strong class="font-bold">${sRut}</strong>, realizó el curso sobre 
        <strong class="font-bold uppercase">“${cName}”</strong>, 
        conforme a la ${normText}, entre 
        <span>${startText} y ${endText}</span>, con una duración de 
        <strong class="font-bold">${state.hours || '--'} horas cronológicas</strong>${locText ? ', ' + locText : ''}.
      `;
    } else {
      paragraphHtml = `
        Por cuanto don(a) 
        <span class="cert-font-script font-bold text-[1.25em] text-black not-italic inline leading-none align-baseline px-0.5" style="line-height: 1; vertical-align: baseline;">${sName}</span>, 
        Rut: <strong class="font-bold text-black">${sRut}</strong>, ha dado cumplimiento a los requisitos impuestos en la ${normText}, para el curso 
        <strong class="font-bold uppercase">“${cName}”</strong>, 
        entre <span>${startText} y ${endText}</span>, con una duración de 
        <strong class="font-bold">${state.hours || '--'} horas cronológicas</strong>${locText ? ', ' + locText : ''}.
      `;
    }

    document.getElementById('prev-body-paragraph').innerHTML = paragraphHtml;
    document.getElementById('prev-sence').textContent = state.codeSenceFormatted || state.codeSence || '0000000000';
    
    const issueText = CertificatePdfBuilder.formatIssueDate(state.issueDate || todayFormatted);
    document.getElementById('prev-issue-date').textContent = issueText;

    previewIndexLabel.textContent = state.students.length > 0 ? `${state.currentIndex + 1} / ${state.students.length}` : '0 / 0';

    // Generar código QR para la vista previa
    renderPreviewQr(currentStudent);
  }

  function getVerificationUrlForStudent(student) {
    let base = state.baseUrl ? state.baseUrl.trim() : 'https://valida.empresasbrisein.com';

    // Tupla compacta para mantener el QR con cuadros grandes y fácil escaneo:
    // [rut, name, codeSence, startDate, endDate, issueDate, companyName, companyRut]
    const tuple = [
      student.rut || '12.345.678-9',
      student.name || 'Alumno',
      state.codeSence || '1238044236',
      state.startDate || '',
      state.endDate || '',
      state.issueDate || todayFormatted,
      (state.companyName || '').trim(),
      (state.companyRut || '').trim()
    ];

    const jsonStr = JSON.stringify(tuple);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));

    if (base.includes('?')) {
      return `${base}&c=${b64}`;
    } else {
      return `${base}?c=${b64}`;
    }
  }

  function renderPreviewQr(student) {
    const qrCanvas = document.getElementById('qr-canvas-preview');
    if (!qrCanvas) return;
    const verifyUrl = getVerificationUrlForStudent(student);

    if (typeof qrcode !== 'undefined') {
      try {
        const qr = qrcode(0, 'L');
        qr.addData(verifyUrl);
        qr.make();
        const count = qr.getModuleCount();
        qrCanvas.width = count * 4;
        qrCanvas.height = count * 4;
        const ctx = qrCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
        ctx.fillStyle = '#000000';

        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
              ctx.fillRect(c * 4, r * 4, 4, 4);
            }
          }
        }
      } catch (e) {
        console.error('Error render preview QR:', e);
      }
    }
  }

  // Función helper para capturar el certificado como Canvas HD
  async function capturePreviewCanvas() {
    const previewEl = document.getElementById('certificate-preview-container');
    if (!previewEl) return null;

    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas no está cargado');
    }

    return await html2canvas(previewEl, {
      scale: 3.5, // Ultra Alta Definición (300+ DPI)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });
  }

  // 11. Descargar Foto (PNG HD)
  if (btnDownloadCurrentPng) {
    btnDownloadCurrentPng.addEventListener('click', async () => {
      if (state.students.length === 0) {
        alert('Agrega al menos un alumno para generar la imagen.');
        return;
      }

      const student = state.students[state.currentIndex];
      const origText = btnDownloadCurrentPng.innerHTML;
      btnDownloadCurrentPng.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generando PNG...';
      btnDownloadCurrentPng.disabled = true;

      try {
        const canvas = await capturePreviewCanvas();
        const imgUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = `Certificado_${student.cleanRut || 'Brisein'}_${student.name.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        alert('Error generando imagen: ' + err.message);
      } finally {
        btnDownloadCurrentPng.innerHTML = origText;
        btnDownloadCurrentPng.disabled = false;
      }
    });
  }

  // 12. Descargar PDF del Alumno Actual (100% IDÉNTICO a la Foto / Previa)
  btnDownloadCurrentPdf.addEventListener('click', async () => {
    if (state.students.length === 0) {
      alert('Agrega al menos un alumno para generar el certificado.');
      return;
    }

    const student = state.students[state.currentIndex];
    if (!student.name || !student.rut) {
      alert('Por favor completa el Nombre y RUT del alumno antes de descargar.');
      return;
    }

    const origText = btnDownloadCurrentPdf.innerHTML;
    btnDownloadCurrentPdf.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generando PDF...';
    btnDownloadCurrentPdf.disabled = true;

    try {
      // 1. Capturamos la previa en HD exacta
      const canvas = await capturePreviewCanvas();
      const imgData = canvas.toDataURL('image/png');

      // 2. Insertamos la imagen HD en el PDF A4 oficial
      const PDFLib = window.PDFLib || (typeof PDFDocument !== 'undefined' ? { PDFDocument } : null);
      if (PDFLib && PDFLib.PDFDocument) {
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const pngImage = await pdfDoc.embedPng(imgData);
        
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: 595.28,
          height: 841.89
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_${student.cleanRut || 'Brisein'}_${student.name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Fallback vectorial si PDFLib no está en window
        const certData = {
          studentName: student.name,
          studentRut: student.rut,
          cleanRut: student.cleanRut,
          courseName: state.courseName || 'CURSO DE CAPACITACIÓN',
          codeSence: state.codeSence || '1238044236',
          codeSenceFormatted: state.codeSenceFormatted || state.codeSence,
          hours: state.hours || 40,
          startDate: state.startDate,
          endDate: state.endDate,
          issueDate: state.issueDate || todayFormatted,
          legalNorm: state.legalNorm,
          companyName: state.companyName,
          companyRut: state.companyRut,
          locationText: state.locationText,
          signatoryName: state.signatoryName,
          signatoryTitle: state.signatoryTitle,
          verificationUrl: getVerificationUrlForStudent(student)
        };
        const pdfBytes = await CertificatePdfBuilder.buildCertificate(certData);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_${student.cleanRut || 'Brisein'}_${student.name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Error generando PDF: ' + err.message);
    } finally {
      btnDownloadCurrentPdf.innerHTML = origText;
      btnDownloadCurrentPdf.disabled = false;
    }
  });

  // 13. Descargar Lote Completo en Formato ZIP
  btnGenerateAllZip.addEventListener('click', async () => {
    if (state.students.length === 0) {
      alert('No hay alumnos en la lista para exportar.');
      return;
    }

    if (!window.JSZip) {
      alert('JSZip no está disponible.');
      return;
    }

    const zip = new window.JSZip();
    const origText = btnGenerateAllZip.innerHTML;
    btnGenerateAllZip.disabled = true;

    const courseSlug = (state.courseName || 'Curso').slice(0, 25).trim().replace(/[^a-zA-Z0-9]/g, '_');
    const folderName = `Certificados_${courseSlug}_${state.endDate || 'Brisein'}`;
    const certsFolder = zip.folder(folderName);

    try {
      for (let i = 0; i < state.students.length; i++) {
        const student = state.students[i];
        if (!student.name) continue;

        btnGenerateAllZip.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generando ${i + 1}/${state.students.length}...`;

        const certData = {
          studentName: student.name,
          studentRut: student.rut,
          cleanRut: student.cleanRut,
          courseName: state.courseName || 'CURSO DE CAPACITACIÓN',
          codeSence: state.codeSence || '1238044236',
          codeSenceFormatted: state.codeSenceFormatted || state.codeSence,
          hours: state.hours || 40,
          startDate: state.startDate,
          endDate: state.endDate,
          issueDate: state.issueDate || todayFormatted,
          legalNorm: state.legalNorm,
          companyName: state.companyName,
          companyRut: state.companyRut,
          locationText: state.locationText,
          signatoryName: state.signatoryName,
          signatoryTitle: state.signatoryTitle,
          verificationUrl: getVerificationUrlForStudent(student)
        };

        const pdfBytes = await CertificatePdfBuilder.buildCertificate(certData);
        const fileName = `Certificado_${student.cleanRut || i + 1}_${student.name.replace(/\s+/g, '_')}.pdf`;
        certsFolder.file(fileName, pdfBytes);
      }

      btnGenerateAllZip.innerHTML = '<i class="fa-solid fa-file-zipper mr-1"></i> Comprimiendo ZIP...';
      const content = await zip.generateAsync({ type: 'blob' });
      
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al empaquetar certificados: ' + err.message);
    } finally {
      btnGenerateAllZip.innerHTML = origText;
      btnGenerateAllZip.disabled = false;
    }
  });

  // 14. Imprimir Certificado Actual
  btnPrintCurrent.addEventListener('click', async () => {
    if (state.students.length === 0) return;
    const student = state.students[state.currentIndex];
    const certData = {
      studentName: student.name || 'Participante',
      studentRut: student.rut || '12.345.678-9',
      cleanRut: student.cleanRut,
      courseName: state.courseName || 'CURSO',
      codeSence: state.codeSence,
      codeSenceFormatted: state.codeSenceFormatted,
      hours: state.hours,
      startDate: state.startDate,
      endDate: state.endDate,
      issueDate: state.issueDate || todayFormatted,
      legalNorm: state.legalNorm,
      companyName: state.companyName,
      companyRut: state.companyRut,
      locationText: state.locationText,
      signatoryName: state.signatoryName,
      signatoryTitle: state.signatoryTitle,
      verificationUrl: getVerificationUrlForStudent(student)
    };
    const pdfBytes = await CertificatePdfBuilder.buildCertificate(certData);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    }
  });

  // 15. Modal de Configuración
  btnShowSettings.addEventListener('click', () => {
    settingBaseUrl.value = state.baseUrl;
    settingSignatoryName.value = state.signatoryName;
    settingSignatoryTitle.value = state.signatoryTitle;
    modalSettings.classList.remove('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    modalSettings.classList.add('hidden');
  });

  btnSaveSettings.addEventListener('click', () => {
    state.baseUrl = settingBaseUrl.value.trim();
    state.signatoryName = settingSignatoryName.value.trim();
    state.signatoryTitle = settingSignatoryTitle.value.trim();

    try {
      localStorage.setItem('brisein_base_url', state.baseUrl);
      localStorage.setItem('brisein_sig_name', state.signatoryName);
      localStorage.setItem('brisein_sig_title', state.signatoryTitle);
    } catch (e) {}

    modalSettings.classList.add('hidden');
    updatePreview();
  });

  // Carga inicial limpia
  renderStudentsTable();
  updatePreview();
});
