const app = document.getElementById('app');

// --------- Register Service Worker ---------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('ServiceWorker registered'))
      .catch(err => console.log('ServiceWorker registration failed: ', err));
  });
}

// --------- Theme Management ---------
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) return;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeToggle.innerHTML = isDark ? 
    '<svg viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>' :
    '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
}

// --------- Swipe Navigation ---------
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
  if (touchEndX < touchStartX - 50) {
    // Swipe left - navigate forward
    const hash = location.hash.replace('#', '');
    if (!hash) {
      // If on home, go to first machine
      const machines = DB.machines;
      if (machines && machines.length > 0) {
        location.hash = machines[0].id;
      }
    }
  }
  
  if (touchEndX > touchStartX + 50) {
    // Swipe right - go back
    history.back();
  }
}

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

// --------- Create Theme Toggle Button ---------
function createThemeToggle() {
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Toggle theme');
  toggle.addEventListener('click', toggleTheme);
  document.body.appendChild(toggle);
  updateThemeIcon();
}

// --------- Render Home Screen ---------
async function renderHome() {
  app.innerText = '';
  const container = document.createElement('div');
  container.className = 'container';
  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.innerHTML = '<span class="logo-bold">VEND</span> <span class="logo-thin">PRO</span>';
  container.appendChild(logo);
  const subtitle = document.createElement('div');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'ІНФОРМАЦІЙНИЙ ДОВІДНИК';
  container.appendChild(subtitle);
  
  try {
    const machines = DB.machines;
    machines.forEach(machine => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = machine.name;
      btn.addEventListener('click', () => {
        if (machine.id === 'video_instruction') {
          location.hash = 'videos';
        } else {
          location.hash = machine.id;
        }
      });
      container.appendChild(btn);
    });

  } catch (error) {
    console.error("Could not fetch machines:", error);
    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'Не вдалося завантажити список автоматів.';
    errorMsg.style.color = 'red';
    container.appendChild(errorMsg);
  }

  const adminBtn = document.createElement('button');
  adminBtn.className = 'btn';
  adminBtn.textContent = 'Адмін Панель';
  adminBtn.style.background = 'linear-gradient(to right, #4A5568, #718096)';
  adminBtn.addEventListener('click', () => {
      location.hash = '#admin';
  });
  container.appendChild(adminBtn);

  app.appendChild(container);
}

// --------- Render Machine Page ---------
function renderMachine(machineId) {
  app.innerText = '';
  // Watermark
  const watermark = document.createElement('div');
  watermark.className = 'watermark';
  watermark.textContent = 'VEND PRO';
  app.appendChild(watermark);
  // Container
  const container = document.createElement('div');
  container.className = 'container machine-content';
  // Back Button
  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.textContent = '← НАЗАД';
  backBtn.addEventListener('click', () => {
    location.hash = '';
  });
  container.appendChild(backBtn);
  // Explanation Text
  const infoText = document.createElement('p');
  infoText.textContent = 'Введіть номер тривоги';
  infoText.style.marginTop = '20px';
  container.appendChild(infoText);
  // Input Field
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Номер тривоги…';
  input.autofocus = true;
  input.style.width = '100%';
  input.style.maxWidth = '400px';
  container.appendChild(input);
  // Enter Button
  const enterBtn = document.createElement('button');
  enterBtn.className = 'btn enter-btn';
  enterBtn.textContent = 'ВВЕСТИ';
  enterBtn.addEventListener('click', async () => {
    const code = input.value.trim();
    if (!code) return;
    try {
      const machines = DB.machines;
      const machineData = machines.find(m => m.id === machineId);
      const entry = machineData.errors.find(e => e.id === code);

      if (!entry) {
          alert('Помилка з таким кодом не знайдена.');
          return;
      }
      renderErrorPage(machineId, code, entry);
    } catch (error) {
        console.error('Error:', error);
        alert('Не вдалося завантажити дані про помилку.');
    }
  });
  container.appendChild(enterBtn);

  const allErrorsBtn = document.createElement('button');
  allErrorsBtn.className = 'btn';
  allErrorsBtn.textContent = 'Показати всі помилки';
  allErrorsBtn.style.background = 'linear-gradient(to right, #4A5568, #718096)';
  allErrorsBtn.addEventListener('click', () => {
      renderAllErrors(machineId);
  });
  container.appendChild(allErrorsBtn);
  
  app.appendChild(container);
}

// --------- Render All Errors Page ---------
function renderAllErrors(machineId) {
  app.innerText = '';
  // Watermark
  const watermark = document.createElement('div');
  watermark.className = 'watermark';
  watermark.textContent = 'VEND PRO';
  app.appendChild(watermark);
  // Container
  const container = document.createElement('div');
  container.className = 'container';
  // Back Button
  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.textContent = '← НАЗАД';
  backBtn.addEventListener('click', () => {
    renderMachine(machineId);
  });
  container.appendChild(backBtn);
  
  const machineData = DB.machines.find(m => m.id === machineId);
  if (!machineData) {
      alert('Machine not found!');
      renderHome();
      return;
  }

  const title = document.createElement('h2');
  title.textContent = `Всі помилки для ${machineData.name}`;
  title.style.textAlign = 'center';
  title.style.marginTop = '80px';
  title.style.marginBottom = '20px';
  container.appendChild(title);

  const allErrorsContainer = document.createElement('div');
  allErrorsContainer.className = 'accordion';

  machineData.errors.forEach(error => {
    let fullText = `Опис помилки та причина виникнення:\n\n${error.fix}`;
    if (error.steps && error.steps.trim() !== '') {
        fullText += `\n\n\nДіагностика та кроки по усуненню помилки чи несправностей:\n\n${error.steps}`;
    }
    const panelTitle = `#${error.id}: ${error.ua}`;
    const panel = createPanel(panelTitle, fullText);
    allErrorsContainer.appendChild(panel);
  });

  container.appendChild(allErrorsContainer);
  app.appendChild(container);
}

// --------- Render Error Display ---------
function renderErrorPage(machineId, code, entry) {
  if (!entry) {
    alert('Дані про помилку порожні.');
    return;
  }
  app.innerText = '';
  // Watermark
  const watermark = document.createElement('div');
  watermark.className = 'watermark';
  watermark.textContent = 'VEND PRO';
  app.appendChild(watermark);
  // Container
  const container = document.createElement('div');
  container.className = 'container';
  // Back Button
  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.textContent = '← НАЗАД';
  backBtn.addEventListener('click', () => {
    renderMachine(machineId);
  });
  container.appendChild(backBtn);
  // Error Container
  const errCont = document.createElement('div');
  errCont.className = 'error-container';
  // Code
  const errCode = document.createElement('div');
  errCode.className = 'error-code';
  errCode.textContent = `#${code}`;
  errCont.appendChild(errCode);
  // Ukrainian Message
  const errUa = document.createElement('div');
  errUa.className = 'error-msg';
  errUa.textContent = `${entry.ua} (UA)`;
  errCont.appendChild(errUa);
  // Accordion Container
  const acc = document.createElement('div');
  acc.className = 'accordion';

  // Panel: Послідовність усунення
  const panel1 = createPanel('Опис помилки та причина виникнення', entry.fix);
  acc.appendChild(panel1);
  // Panel: Детальні кроки
  const panel2 = createPanel('Діагностика та кроки по усуненню помилки чи несправностей', entry.steps);
  acc.appendChild(panel2);

  errCont.appendChild(acc);
  container.appendChild(errCont);
  app.appendChild(container);
}

// --------- Create Accordion Panel ---------
function createPanel(title, text) {
  const panel = document.createElement('div');
  panel.className = 'panel';
  // Header
  const header = document.createElement('div');
  header.className = 'panel-header';
  const titleSpan = document.createElement('span');
  titleSpan.textContent = title;
  header.appendChild(titleSpan);
  const toggleIcon = document.createElement('span');
  toggleIcon.className = 'toggle-icon';
  toggleIcon.textContent = '▼';
  header.appendChild(toggleIcon);
  panel.appendChild(header);
  // Content
  const content = document.createElement('div');
  content.className = 'panel-content';
  const p = document.createElement('pre');
  p.textContent = text;
  content.appendChild(p);
  // Copy Section
  const copySection = document.createElement('div');
  copySection.className = 'copy-section';
  const copyIcon = document.createElement('span');
  copyIcon.className = 'copy-icon';
  copyIcon.textContent = '📋';
  copyIcon.title = 'Скопіювати';
  copyIcon.addEventListener('click', () => {
    navigator.clipboard.writeText(text);
  });
  copySection.appendChild(copyIcon);
  // Collapse Button
  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'collapse-btn';
  collapseBtn.textContent = 'Згорнути';
  collapseBtn.addEventListener('click', () => {
    content.style.display = 'none';
    toggleIcon.style.transform = 'rotate(0deg)';
  });   
  copySection.appendChild(collapseBtn);
  content.appendChild(copySection);
  panel.appendChild(content);

  // Header click toggles content
  header.addEventListener('click', () => {
    if (content.style.display === 'block') {
      content.style.display = 'none';
      toggleIcon.style.transform = 'rotate(0deg)';
    } else {
      content.style.display = 'block';
      toggleIcon.style.transform = 'rotate(180deg)';
    }
  });

  return panel;
}

function promptForAdminPassword() {
    const password = prompt("Введіть пароль для доступу:");
    if (password === "Berswsicebenito12") {
        sessionStorage.setItem('isAdmin', 'true');
        renderAdminPanel();
    } else {
        alert("Неправильний пароль!");
        location.hash = '';
    }
}

// --------- Router ---------
async function router() {
  const hash = location.hash.replace('#', '').toLowerCase();
  
  // Fade out current content
  if (app.firstChild) {
    app.firstChild.classList.add('fade-out');
  }

  // A small delay to allow fade-out animation
  setTimeout(() => {
    if (!hash) {
        renderHome();
        return;
    }
    
    if (hash === 'admin') {
        if (sessionStorage.getItem('isAdmin') === 'true') {
            renderAdminPanel();
        } else {
            promptForAdminPassword();
        }
        return;
    }
    
    if (hash === 'videos') {
        renderVideoSelectionPage();
        return;
    }
    
    try {
        const machines = DB.machines;
        if (machines.some(m => m.id === hash)) {
            renderMachine(hash);
        } else {
            renderHome();
        }
    } catch (e) {
        console.error(e);
        renderHome();
    }
  }, 200); // Same duration as fade-out animation
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
  initTheme();
  createThemeToggle();
  router();
});

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  appContainer.classList.add('fade-in');

  const fixLineBreaks = () => {
    document.querySelectorAll('.accordion-body').forEach(el => {
      el.style.whiteSpace = 'pre-line';
      el.style.textAlign = 'left';
    });
  };

  fixLineBreaks();
  document.body.addEventListener('click', () => setTimeout(fixLineBreaks, 0));
});

// --------- Show Video Modal ---------
function showVideoModal(videoUrl) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const closeBtn = document.createElement('span');
  closeBtn.className = 'modal-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    modalOverlay.remove();
  });
  modalContent.appendChild(closeBtn);

  const iframe = document.createElement('iframe');
  iframe.src = videoUrl;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.frameBorder = '0';
  iframe.width = '100%';
  iframe.height = '100%';
  modalContent.appendChild(iframe);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

// --------- Render Video Selection Page ---------
function renderVideoSelectionPage() {
  app.innerText = ''; // Очищаємо вміст сторінки
  const container = document.createElement('div');
  container.className = 'container';

  // Back Button
  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.textContent = '← НАЗАД';
  backBtn.addEventListener('click', () => {
    location.hash = ''; // Повертаємось на головну
  });
  container.appendChild(backBtn);

  const title = document.createElement('h2');
  title.textContent = 'Оберіть відеоінструкцію';
  title.style.textAlign = 'center';
  title.style.marginTop = '80px';
  title.style.marginBottom = '20px';
  container.appendChild(title);

  const videoInstructionData = DB.machines.find(m => m.id === 'video_instruction');
  if (videoInstructionData && videoInstructionData.videos) {
    videoInstructionData.videos.forEach(video => {
      const videoBtn = document.createElement('button');
      videoBtn.className = 'btn'; // Використовуємо існуючий стиль кнопок
      videoBtn.textContent = video.name;
      videoBtn.addEventListener('click', () => {
        showVideoModal(video.url); // Передаємо URL конкретного відео
      });
      container.appendChild(videoBtn);
    });
  } else {
    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'Відеоінструкції не знайдені.';
    errorMsg.style.color = 'red';
    container.appendChild(errorMsg);
  }

  app.appendChild(container);
} 