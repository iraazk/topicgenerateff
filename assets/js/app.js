/**
 * FF TopicGen - Main Application Logic
 * Pure Vanilla JavaScript ES6+
 * Super lightweight, zero dependencies, responsive and accessible.
 */

(function () {
  'use strict';

  // --- Category Mapping & Meta Information ---
  const CATEGORY_NAMES = {
    'strategi-dan-kepemimpinan': 'Strategi dan Kepemimpinan',
    'inspirasi-pro-player': 'Inspirasi Pro Player',
    'komunitas-dan-dampak-positif': 'Komunitas dan Dampak Positif',
    'karier-di-esports-ff': 'Karier di Esports FF'
  };

  const CATEGORY_BADGE_CLASSES = {
    'strategi-dan-kepemimpinan': 'badge-strategi',
    'inspirasi-pro-player': 'badge-inspirasi',
    'komunitas-dan-dampak-positif': 'badge-komunitas',
    'karier-di-esports-ff': 'badge-karier'
  };

  const DIFFICULTY_NAMES = {
    'mudah': 'Mudah',
    'sedang': 'Sedang',
    'menantang': 'Menantang'
  };

  // --- State ---
  let allTopics = [];
  let isDataLoaded = false;
  let currentTopic = null;
  let activeCategory = 'all';
  let activeDifficulty = 'all';
  let activeDuration = 'all';
  
  // F-06: In-memory session history to prevent repetitive topics
  const sessionHistory = new Set();

  // --- DOM Elements ---
  const elGenerateBtn = document.getElementById('btn-generate');
  const elCopyBtn = document.getElementById('btn-copy');
  const elCardContent = document.getElementById('topic-card-content');
  const elLiveRegion = document.getElementById('a11y-live-region');
  const elThemeToggle = document.getElementById('btn-theme-toggle');
  const elShareBtn = document.getElementById('btn-share');

  // --- Helper: Random Selection ---
  function getRandomIndex(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  // --- Theme Management (F-09) ---
  function initTheme() {
    const storedTheme = localStorage.getItem('fftopicgen_theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      applyTheme(storedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fftopicgen_theme', theme);
    if (elThemeToggle) {
      const isDark = theme === 'dark';
      elThemeToggle.setAttribute('aria-label', isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap');
      elThemeToggle.title = isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap';
      const icon = elThemeToggle.querySelector('use');
      if (icon) {
        icon.setAttribute('href', isDark ? '#icon-sun' : '#icon-moon');
      }
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // --- Fetch Topics Data ---
  async function loadTopicsData() {
    try {
      const res = await fetch('data/topics.json');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      allTopics = await res.json();
      isDataLoaded = true;
      if (elGenerateBtn) {
        elGenerateBtn.removeAttribute('disabled');
      }
    } catch (err) {
      console.error('Gagal memuat bank topik:', err);
      showErrorState();
    }
  }

  // --- Filter Pool Calculation ---
  function getFilteredPool() {
    return allTopics.filter(item => {
      // Category match
      if (activeCategory !== 'all' && item.kategori !== activeCategory) {
        return false;
      }
      // Difficulty match
      if (activeDifficulty !== 'all' && item.kesulitan !== activeDifficulty) {
        return false;
      }
      // Duration match
      if (activeDuration !== 'all') {
        const targetDur = parseInt(activeDuration, 10);
        if (!item.durasi || !item.durasi.includes(targetDur)) {
          return false;
        }
      }
      return true;
    });
  }

  // --- F-01 & F-06: Generate Topic with Anti-Repeat ---
  function generateTopic() {
    if (!isDataLoaded) return;

    const pool = getFilteredPool();

    if (pool.length === 0) {
      currentTopic = null;
      showEmptyState();
      announceLive('Tidak ada topik yang cocok untuk kombinasi filter ini.');
      return;
    }

    // Filter unshown topics in current session
    let available = pool.filter(t => !sessionHistory.has(t.id));

    // If all in pool have been shown, reset session history
    if (available.length === 0) {
      sessionHistory.clear();
      // If pool has more than 1 item, exclude current to prevent immediate duplicate
      if (currentTopic && pool.length > 1) {
        sessionHistory.add(currentTopic.id);
      }
      available = pool.filter(t => !sessionHistory.has(t.id));
      if (available.length === 0) {
        available = pool;
      }
    }

    const pickedIndex = getRandomIndex(available.length);
    const selected = available[pickedIndex];
    sessionHistory.add(selected.id);
    currentTopic = selected;

    renderTopicCard(selected);
  }

  // --- Render Topic Card ---
  function renderTopicCard(topic) {
    if (!elCardContent) return;

    const categoryName = CATEGORY_NAMES[topic.kategori] || topic.kategori;
    const badgeClass = CATEGORY_BADGE_CLASSES[topic.kategori] || 'badge-meta';
    const difficultyName = DIFFICULTY_NAMES[topic.kesulitan] || topic.kesulitan;
    const durationText = Array.isArray(topic.durasi) 
      ? topic.durasi.join('-') + ' menit' 
      : topic.durasi + ' menit';

    // Talking points HTML
    let pointsHtml = '';
    if (topic.poin && topic.poin.length > 0) {
      const items = topic.poin.map(p => `<li>${escapeHtml(p)}</li>`).join('');
      pointsHtml = `
        <div class="talking-points">
          <div class="talking-points-title">Poin Pembahasan</div>
          <ul class="talking-points-list">
            ${items}
          </ul>
        </div>
      `;
    }

    // Trigger smooth fade transition
    elCardContent.classList.add('fade-out');

    setTimeout(() => {
      elCardContent.innerHTML = `
        <div class="card-header-meta">
          <span class="badge ${badgeClass}">${escapeHtml(categoryName)}</span>
          <span class="badge badge-meta">Tingkat: ${escapeHtml(difficultyName)}</span>
          <span class="badge badge-meta">Durasi: ${escapeHtml(durationText)}</span>
        </div>
        <h2 class="topic-text">${escapeHtml(topic.teks)}</h2>
        ${pointsHtml}
      `;

      elCardContent.classList.remove('fade-out');

      // Enable and prepare copy button
      if (elCopyBtn) {
        elCopyBtn.removeAttribute('disabled');
        elCopyBtn.classList.remove('copied');
        elCopyBtn.innerHTML = `
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span>Copy Text</span>
        `;
      }

      // Announce for Screen Readers
      announceLive(`Topik baru: ${topic.teks}. Kategori ${categoryName}.`);
    }, 120);
  }

  // --- Show Empty State ---
  function showEmptyState() {
    if (!elCardContent) return;

    elCardContent.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <div class="empty-state-title">Belum ada topik yang cocok</div>
        <p class="empty-state-desc">
          Tidak ada topik untuk kombinasi filter ini. Coba ganti pilihan tingkat kesulitan atau durasi menjadi Semua.
        </p>
      </div>
    `;

    if (elCopyBtn) {
      elCopyBtn.setAttribute('disabled', 'true');
    }
  }

  // --- Show Error State ---
  function showErrorState() {
    if (!elCardContent) return;

    elCardContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Gagal memuat data</div>
        <p class="empty-state-desc">
          Terjadi kendala saat memuat berkas topik. Silakan muat ulang halaman atau periksa koneksi peramban Anda.
        </p>
      </div>
    `;
  }

  // --- F-05: Copy to Clipboard ---
  async function copyTopicText() {
    if (!currentTopic || !elCopyBtn) return;

    const categoryName = CATEGORY_NAMES[currentTopic.kategori] || currentTopic.kategori;
    const difficultyName = DIFFICULTY_NAMES[currentTopic.kesulitan] || currentTopic.kesulitan;
    const durationText = Array.isArray(currentTopic.durasi) 
      ? currentTopic.durasi.join('-') + ' menit' 
      : currentTopic.durasi + ' menit';

    // Format specification from PRD F-05
    const textToCopy = 
`Topik: ${currentTopic.teks}
Kategori: ${categoryName}
Tingkat: ${difficultyName}
Durasi: ${durationText}`;

    let success = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch (e) {
        success = fallbackCopy(textToCopy);
      }
    } else {
      success = fallbackCopy(textToCopy);
    }

    if (success) {
      elCopyBtn.classList.add('copied');
      elCopyBtn.innerHTML = `
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        <span>Tersalin</span>
      `;
      announceLive('Teks topik berhasil disalin ke papan klip.');

      setTimeout(() => {
        elCopyBtn.classList.remove('copied');
        elCopyBtn.innerHTML = `
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span>Copy Text</span>
        `;
      }, 2000);
    } else {
      announceLive('Gagal menyalin otomatis. Silakan salin teks secara manual.');
    }
  }

  // Fallback copy using textarea
  function fallbackCopy(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      area.style.top = '-9999px';
      document.body.appendChild(area);
      area.focus();
      area.select();
      const res = document.execCommand('copy');
      document.body.removeChild(area);
      return res;
    } catch (err) {
      return false;
    }
  }

  // --- F-08: Web Share API ---
  async function shareSite() {
    const shareData = {
      title: 'FF TopicGen — Random Topic Generator untuk Esports Free Fire',
      text: 'Dapatkan ide pembicaraan dan konten positif seputar esports Free Fire dengan satu klik!',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User dismissed
      }
    } else {
      // Fallback: Copy URL to clipboard
      fallbackCopy(window.location.href);
      announceLive('Tautan situs berhasil disalin ke papan klip.');
      alert('Tautan situs FF TopicGen telah disalin ke papan klip!');
    }
  }

  // --- Filter Event Handlers ---
  function initFilters() {
    // 1. Category Chips
    const categoryChips = document.querySelectorAll('.category-chips .chip-btn');
    categoryChips.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryChips.forEach(c => c.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        activeCategory = btn.getAttribute('data-category') || 'all';
      });
    });

    // 2. Difficulty Segment
    const diffButtons = document.querySelectorAll('[data-filter-group="kesulitan"] .segment-btn');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        activeDifficulty = btn.getAttribute('data-value') || 'all';
      });
    });

    // 3. Duration Segment
    const durButtons = document.querySelectorAll('[data-filter-group="durasi"] .segment-btn');
    durButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        durButtons.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        activeDuration = btn.getAttribute('data-value') || 'all';
      });
    });
  }

  // --- Screen Reader Live Region Announcer ---
  function announceLive(message) {
    if (elLiveRegion) {
      elLiveRegion.textContent = '';
      setTimeout(() => {
        elLiveRegion.textContent = message;
      }, 50);
    }
  }

  // --- Utility: Escape HTML ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Init App ---
  function init() {
    initTheme();
    initFilters();
    loadTopicsData();

    if (elGenerateBtn) {
      elGenerateBtn.addEventListener('click', generateTopic);
    }

    if (elCopyBtn) {
      elCopyBtn.addEventListener('click', copyTopicText);
    }

    if (elThemeToggle) {
      elThemeToggle.addEventListener('click', toggleTheme);
    }

    if (elShareBtn) {
      elShareBtn.addEventListener('click', shareSite);
    }

    // Keyboard shortcut: Spacebar on window (when not focusing an interactive input/button) generates topic
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        generateTopic();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
