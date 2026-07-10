/**
 * MD3 Blog Theme - Main JavaScript
 * Vanilla JS interactions for the Material Design 3 blog theme
 */

(function () {
  'use strict';

  const Motion = {
    reduced() {
      return document.body.classList.contains('motion-disabled') ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  };

  const ScrollLock = {
    count: 0,
    lock() {
      this.count += 1;
      document.body.classList.add('scroll-locked');
    },
    unlock() {
      this.count = Math.max(0, this.count - 1);
      if (this.count === 0) document.body.classList.remove('scroll-locked');
    },
    reset() {
      this.count = 0;
      document.body.classList.remove('scroll-locked');
    }
  };

  // ===================================
  // Theme Toggle
  // ===================================
  const ThemeManager = {
    init() {
      const toggle = document.getElementById('theme-toggle');
      const icon = document.getElementById('theme-icon');
      if (!toggle) return;

      // Load saved theme or detect system preference
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = savedTheme || (prefersDark ? 'dark' : 'light');

      this.setTheme(theme, false);

      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next, true);
      });

      // Listen for system preference changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          this.setTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    },

    setTheme(theme, save) {
      document.documentElement.setAttribute('data-theme', theme);
      const icon = document.getElementById('theme-icon');
      if (icon) {
        icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
      }
      if (save) {
        localStorage.setItem('theme', theme);
      }

      // Update Giscus theme if present
      const giscusFrame = document.querySelector('.giscus-frame');
      if (giscusFrame) {
        giscusFrame.contentWindow.postMessage(
          { giscus: { setConfig: { theme: theme === 'dark' ? 'dark' : 'light' } } },
          'https://giscus.app'
        );
      }

      // Update Highlight.js theme
      const hljsLight = document.getElementById('hljs-light');
      const hljsDark = document.getElementById('hljs-dark');
      if (hljsLight && hljsDark) {
        if (theme === 'dark') {
          hljsLight.media = 'none';
          hljsDark.media = 'all';
        } else {
          hljsDark.media = 'none';
          hljsLight.media = 'all';
        }
      }
    }
  };

  // ===================================
  // Header Scroll Effect
  // ===================================
  const HeaderScroll = {
    header: null,
    lastScrollTop: 0,
    ticking: false,

    init() {
      this.header = document.getElementById('md-header');
      if (!this.header) return;

      window.addEventListener('scroll', () => {
        if (!this.ticking) {
          requestAnimationFrame(() => {
            this.update();
            this.ticking = false;
          });
          this.ticking = true;
        }
      }, { passive: true });

      // Initial check
      this.update();
    },

    update() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      if (scrollTop > 50) {
        this.header.classList.add('scrolled');
      } else {
        this.header.classList.remove('scrolled');
      }

      this.lastScrollTop = scrollTop;
    }
  };

  // ===================================
  // Mobile Drawer
  // ===================================
  const MobileDrawer = {
    drawer: null,
    overlay: null,
    menuBtn: null,
    previouslyFocused: null,
    focusableSelector: 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea',

    init() {
      this.drawer = document.getElementById('mobile-drawer');
      this.overlay = document.getElementById('drawer-overlay');
      this.menuBtn = document.getElementById('mobile-menu-btn');

      if (!this.drawer || !this.overlay || !this.menuBtn) return;

      this.menuBtn.addEventListener('click', () => this.open());
      this.overlay.addEventListener('click', () => this.close());

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.drawer.classList.contains('open')) {
          this.close();
        }
      });

      // Focus trap
      this.drawer.addEventListener('focusin', (e) => {
        if (!this.drawer.classList.contains('open')) return;
        if (!this.drawer.contains(e.target)) {
          e.stopPropagation();
          this.getFocusable()[0]?.focus();
        }
      });
    },

    getFocusable() {
      return Array.from(this.drawer.querySelectorAll(this.focusableSelector));
    },

    open() {
      if (this.drawer.classList.contains('open')) return;
      this.previouslyFocused = document.activeElement;
      this.drawer.classList.add('open');
      this.overlay.classList.add('open');
      this.menuBtn.setAttribute('aria-expanded', 'true');
      ScrollLock.lock();
      // Focus first nav item
      const first = this.getFocusable()[0];
      if (first) first.focus();
    },

    close() {
      if (!this.drawer.classList.contains('open')) return;
      this.drawer.classList.remove('open');
      this.overlay.classList.remove('open');
      this.menuBtn.setAttribute('aria-expanded', 'false');
      ScrollLock.unlock();
      // Restore focus to menu button
      if (this.previouslyFocused) this.previouslyFocused.focus();
    }
  };

  // ===================================
  // Back to Top FAB
  // ===================================
  const BackToTop = {
    fab: null,

    init() {
      this.fab = document.getElementById('back-to-top');
      if (!this.fab) return;

      window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
          this.fab.classList.add('visible');
        } else {
          this.fab.classList.remove('visible');
        }
      }, { passive: true });

      this.fab.addEventListener('click', () => {
        const behavior = Motion.reduced() ? 'auto' : 'smooth';
        window.scrollTo({ top: 0, behavior });
      });
    }
  };

  // ===================================
  // Table of Contents — Floating Panel
  // ===================================
  const TableOfContents = {
    tocList: null,
    tocFab: null,
    tocPanel: null,
    tocOverlay: null,
    headers: [],
    observer: null,
    previouslyFocused: null,

    init() {
      this.tocList = document.getElementById('toc-list');
      this.tocFab = document.getElementById('toc-toggle');
      this.tocPanel = document.getElementById('toc-panel');
      this.tocOverlay = document.getElementById('toc-overlay');
      if (!this.tocList) return;

      // Find all headings in post content
      this.headers = Array.from(
        document.querySelectorAll('.post-content h2, .post-content h3, .post-content h4')
      );

      if (this.headers.length === 0) {
        // Hide TOC button if no headings
        if (this.tocFab) this.tocFab.style.display = 'none';
        return;
      }

      this.buildToc();
      this.initObserver();
      this.initPanel();

      // Show the FAB and TOC list
      if (this.tocFab) this.tocFab.classList.add('visible');
      if (this.tocList) this.tocList.style.visibility = '';
    },

    initPanel() {
      const closeBtn = document.getElementById('toc-close');

      // Open panel
      if (this.tocFab) {
        this.tocFab.addEventListener('click', () => this.openPanel());
      }

      // Close via close button
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closePanel());
      }

      // Close via overlay
      if (this.tocOverlay) {
        this.tocOverlay.addEventListener('click', () => this.closePanel());
      }

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.tocPanel?.classList.contains('open')) {
          this.closePanel();
        }
      });
    },

    openPanel() {
      if (this.tocPanel?.classList.contains('open')) return;
      this.previouslyFocused = document.activeElement;
      this.tocPanel?.classList.add('open');
      this.tocOverlay?.classList.add('open');
      this.tocFab?.setAttribute('aria-expanded', 'true');
      ScrollLock.lock();
      document.getElementById('toc-close')?.focus();
    },

    closePanel() {
      if (!this.tocPanel?.classList.contains('open')) return;
      this.tocPanel?.classList.remove('open');
      this.tocOverlay?.classList.remove('open');
      this.tocFab?.setAttribute('aria-expanded', 'false');
      ScrollLock.unlock();
      if (this.previouslyFocused) this.previouslyFocused.focus();
    },

    buildToc() {
      let html = '';
      this.headers.forEach((header) => {
        if (!header.id) {
          header.id = 'heading-' + Math.random().toString(36).substr(2, 9);
        }
        const level = parseInt(header.tagName.charAt(1));
        const text = header.textContent;
        html += `<a href="#${header.id}" class="md-toc__link level-${level}" data-target="${header.id}">${text}</a>`;
      });
      this.tocList.innerHTML = html;

      // Click handler for smooth scroll + close panel
      this.tocList.querySelectorAll('.md-toc__link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('data-target');
          const target = document.getElementById(targetId);
          if (target) {
            this.closePanel();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            const behavior = Motion.reduced() ? 'auto' : 'smooth';
            window.scrollTo({ top, behavior });
          }
        });
      });
    },

    initObserver() {
      const tocLinks = this.tocList.querySelectorAll('.md-toc__link');

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              tocLinks.forEach(link => link.classList.remove('active'));
              const activeLink = this.tocList.querySelector(`[data-target="${entry.target.id}"]`);
              if (activeLink) {
                activeLink.classList.add('active');
              }
            }
          });
        },
        {
          rootMargin: '-80px 0px -80% 0px',
          threshold: 0
        }
      );

      this.headers.forEach(header => this.observer.observe(header));
    }
  };

  // ===================================
  // Code Highlighting
  // ===================================
  const CodeHighlight = {
    observer: null,

    init() {
      this.enhance(document);
      this.observe();
      window.addEventListener('load', () => this.enhance(document), { once: true });
      window.addEventListener('md3:highlight-ready', () => this.enhance(document));
    },

    observe() {
      if (this.observer || !window.MutationObserver) return;

      this.observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.enhance(node);
            }
          });
        });
      });

      this.observer.observe(document.body, { childList: true, subtree: true });
    },

    enhance(root) {
      // Language display names
      const langNames = {
        javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
        java: 'Java', cpp: 'C++', c: 'C', cs: 'C#', go: 'Go', rust: 'Rust',
        ruby: 'Ruby', php: 'PHP', swift: 'Swift', kotlin: 'Kotlin',
        html: 'HTML', css: 'CSS', scss: 'SCSS', less: 'LESS',
        json: 'JSON', xml: 'XML', yaml: 'YAML', toml: 'TOML',
        sql: 'SQL', bash: 'Bash', shell: 'Shell', sh: 'Shell',
        markdown: 'Markdown', dockerfile: 'Docker', makefile: 'Makefile',
        plaintext: 'Text', text: 'Text', nginx: 'Nginx', ini: 'INI'
      };

      const normalizeLang = (lang) => (lang || '')
        .toLowerCase()
        .replace(/^language-/, '')
        .replace(/^lang-/, '')
        .replace(/^highlight-/, '');

      const detectLang = (block, result) => {
        const classSource = [
          block.className,
          block.parentElement ? block.parentElement.className : ''
        ].join(' ');

        const langMatch = classSource.match(/(?:language-|lang-|highlight-)([\w-]+)/);
        if (langMatch) return normalizeLang(langMatch[1]);
        if (block.dataset.lang) return normalizeLang(block.dataset.lang);
        if (block.parentElement && block.parentElement.dataset.language) {
          return normalizeLang(block.parentElement.dataset.language);
        }
        return normalizeLang(result && result.language);
      };

      const addCopyButton = (pre, getCode) => {
        if (!pre || pre.querySelector(':scope > .copy-code-btn')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-code-btn';
        btn.innerHTML = '<span class="md-icon" style="font-size:18px">content_copy</span>';
        btn.setAttribute('aria-label', '复制代码');
        btn.title = '复制代码';

        btn.addEventListener('click', () => {
          const code = getCode();
          navigator.clipboard.writeText(code).then(() => {
            btn.innerHTML = '<span class="md-icon" style="font-size:18px">check</span>';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.innerHTML = '<span class="md-icon" style="font-size:18px">content_copy</span>';
              btn.classList.remove('copied');
            }, 2000);
          }).catch(() => {
            btn.classList.add('copy-failed');
            setTimeout(() => btn.classList.remove('copy-failed'), 1200);
          });
        });

        pre.style.position = 'relative';
        pre.appendChild(btn);
      };

      const codeBlocks = root.matches && root.matches('pre code')
        ? [root]
        : Array.from(root.querySelectorAll ? root.querySelectorAll('pre code') : []);

      codeBlocks.forEach(block => {
        const pre = block.parentElement;
        if (!pre) return;
        if (block.dataset.md3CodeEnhanced === 'true') {
          addCopyButton(pre, () => block.textContent);
          return;
        }

        let result = null;
        if (typeof hljs !== 'undefined') {
          try {
            const source = block.textContent;
            const initialLang = detectLang(block);

            if (initialLang && hljs.getLanguage(initialLang)) {
              hljs.highlightElement(block);
            } else {
              result = hljs.highlightAuto(source);
              block.innerHTML = result.value;
              block.classList.add('hljs');
              if (result.language) block.classList.add(`language-${result.language}`);
            }
          } catch (e) { /* keep readable plain text */ }
        }

        const lang = detectLang(block, result);
        if (lang && lang !== 'plaintext' && lang !== 'text') {
          pre.setAttribute('data-language', langNames[lang] || lang);
        }

        addCopyButton(pre, () => block.textContent);
        if (typeof hljs !== 'undefined') {
          block.dataset.md3CodeEnhanced = 'true';
        }
      });

      const figures = root.matches && root.matches('figure.highlight')
        ? [root]
        : Array.from(root.querySelectorAll ? root.querySelectorAll('figure.highlight') : []);

      figures.forEach(figure => {
        const codePre = figure.querySelector('.code pre') || figure.querySelector('pre');
        if (!codePre) return;

        const classLang = Array.from(figure.classList)
          .map(normalizeLang)
          .find(cls => cls && cls !== 'highlight');
        if (classLang && classLang !== 'plaintext' && classLang !== 'text') {
          figure.setAttribute('data-language', langNames[classLang] || classLang);
        }

        addCopyButton(figure, () => codePre.textContent);
      });
    }
  };

  // ===================================
  // Math Rendering (KaTeX)
  // ===================================
  const MathRenderer = {
    init() {
      if (typeof renderMathInElement === 'undefined') return;

      renderMathInElement(document.querySelector('.post-content'), {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  };

  // ===================================
  // Image Preview
  // ===================================
  const ImagePreview = {
    overlay: null,
    img: null,
    previouslyFocused: null,

    init() {
      this.overlay = document.getElementById('image-preview');
      this.img = document.getElementById('preview-image');
      if (!this.overlay || !this.img) return;

      // Click on post and shuoshuo images to preview
      document.querySelectorAll('.post-content img, .shuoshuo-gallery__item img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
          this.show(img.src);
        });
      });

      document.querySelectorAll('.shuoshuo-gallery__item[data-preview-src]').forEach(button => {
        button.addEventListener('click', () => {
          this.show(button.getAttribute('data-preview-src'));
        });
      });

      // Click overlay to close
      this.overlay.addEventListener('click', () => {
        this.hide();
      });

      // Escape to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
          this.hide();
        }
      });
    },

    show(src) {
      if (!src || this.overlay.style.display !== 'none') return;
      this.previouslyFocused = document.activeElement;
      this.img.src = src;
      this.overlay.style.display = 'flex';
      ScrollLock.lock();
    },

    hide() {
      if (this.overlay.style.display === 'none') return;
      this.overlay.style.display = 'none';
      ScrollLock.unlock();
      if (this.previouslyFocused) this.previouslyFocused.focus();
    }
  };

  // ===================================
  // Shuoshuo Pagination
  // ===================================
  const ShuoshuoPagination = {
    list: null,
    items: [],
    nav: null,
    pageSize: 10,
    totalPages: 1,
    currentPage: 1,

    init() {
      this.list = document.querySelector('.shuoshuo-list');
      this.nav = document.querySelector('.shuoshuo-pagination');
      if (!this.list || !this.nav) return;

      this.items = Array.from(this.list.querySelectorAll('.shuoshuo-item'));
      this.pageSize = Number.parseInt(this.list.dataset.pageSize || '10', 10);
      this.totalPages = Math.max(1, Math.ceil(this.items.length / this.pageSize));
      this.currentPage = this.readPage();

      this.nav.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const action = button.dataset.pageAction;
        const page = button.dataset.page ? Number.parseInt(button.dataset.page, 10) : null;

        if (action === 'prev') this.go(this.currentPage - 1);
        else if (action === 'next') this.go(this.currentPage + 1);
        else if (page) this.go(page);
      });

      this.render(false);
    },

    readPage() {
      const params = new URLSearchParams(window.location.search);
      const page = Number.parseInt(params.get('page') || '1', 10);
      if (Number.isNaN(page)) return 1;
      return Math.min(Math.max(page, 1), this.totalPages);
    },

    go(page) {
      const next = Math.min(Math.max(page, 1), this.totalPages);
      if (next === this.currentPage) return;

      this.currentPage = next;
      this.render(true);
    },

    render(updateUrl) {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;

      this.items.forEach((item, index) => {
        item.hidden = index < start || index >= end;
      });

      this.nav.querySelectorAll('[data-page]').forEach(button => {
        const page = Number.parseInt(button.dataset.page, 10);
        const active = page === this.currentPage;
        button.classList.toggle('active', active);
        button.setAttribute('aria-current', active ? 'page' : 'false');
      });

      const prev = this.nav.querySelector('[data-page-action="prev"]');
      const next = this.nav.querySelector('[data-page-action="next"]');
      if (prev) prev.disabled = this.currentPage === 1;
      if (next) next.disabled = this.currentPage === this.totalPages;

      if (updateUrl) {
        const url = new URL(window.location.href);
        if (this.currentPage === 1) url.searchParams.delete('page');
        else url.searchParams.set('page', String(this.currentPage));
        window.history.pushState({}, '', url);

        const behavior = Motion.reduced() ? 'auto' : 'smooth';
        document.querySelector('.shuoshuo-page')?.scrollIntoView({ behavior, block: 'start' });
      }
    }
  };

  // ===================================
  // Smooth Scroll for Anchor Links
  // ===================================
  const SmoothScroll = {
    init() {
      const behavior = Motion.reduced() ? 'auto' : 'smooth';
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const targetId = anchor.getAttribute('href').slice(1);
          if (!targetId) return;
          const target = document.getElementById(targetId);
          if (target) {
            e.preventDefault();
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior });
          }
        });
      });
    }
  };

  // ===================================
  // Search Dialog
  // ===================================
  const SearchDialog = {
    overlay: null,
    dialog: null,
    input: null,
    results: null,
    data: null,
    activeIndex: -1,
    loaded: false,
    previouslyFocused: null,

    init() {
      this.overlay = document.getElementById('search-overlay');
      this.dialog = document.getElementById('search-dialog');
      this.input = document.getElementById('search-input');
      this.results = document.getElementById('search-results');
      const closeBtn = document.getElementById('search-close');
      const toggleBtn = document.getElementById('search-toggle');

      if (!this.overlay || !this.dialog) return;

      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.open());
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      this.overlay.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.dialog.classList.contains('open')) {
          this.close();
        }
        // Ctrl+K or / to open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          this.open();
        }
        if (e.key === '/' && !this.dialog.classList.contains('open') &&
            !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          this.open();
        }
      });

      if (this.input) {
        this.input.addEventListener('input', () => this.search());
        this.input.addEventListener('keydown', (e) => this.handleNav(e));
      }
    },

    open() {
      if (this.dialog.classList.contains('open')) return;
      this.previouslyFocused = document.activeElement;
      this.overlay.classList.add('open');
      this.dialog.classList.add('open');
      ScrollLock.lock();
      if (this.input) {
        requestAnimationFrame(() => {
          window.setTimeout(() => this.input.focus(), 40);
        });
      }
      if (!this.loaded) this.loadData();
    },

    close() {
      if (!this.dialog.classList.contains('open')) return;
      this.overlay.classList.remove('open');
      this.dialog.classList.remove('open');
      ScrollLock.unlock();
      this.activeIndex = -1;
      if (this.previouslyFocused) this.previouslyFocused.focus();
    },

    async loadData() {
      try {
        const resp = await fetch('/search.json');
        const raw = await resp.json();
        // hexo-generator-searchdb outputs a plain array, normalize to {posts: [...]}
        this.data = Array.isArray(raw) ? { posts: raw } : raw;
        this.loaded = true;
      } catch (e) {
        console.warn('搜索数据加载失败:', e);
        this.results.innerHTML = '<div class="md-search-dialog__empty">搜索数据加载失败</div>';
      }
    },

    search() {
      const query = this.input.value.trim().toLowerCase();
      if (!query) {
        this.results.innerHTML = '<div class="md-search-dialog__empty">输入关键词开始搜索</div>';
        this.activeIndex = -1;
        return;
      }
      if (!this.data) return;

      const keywords = query.split(/\s+/).filter(Boolean);
      let results = (this.data.posts || [])
        .filter(post => {
          const title = (post.title || '').toLowerCase();
          const text = (post.content || post.text || '').toLowerCase();
          return keywords.every(kw => title.includes(kw) || text.includes(kw));
        })
        .slice(0, 10);

      if (results.length === 0) {
        this.results.innerHTML = '<div class="md-search-dialog__empty">没有找到相关文章</div>';
        this.activeIndex = -1;
        return;
      }

      let html = '';
      results.forEach((post, i) => {
        let excerpt = post.content || post.text || '';
        // Truncate excerpt
        if (excerpt.length > 150) excerpt = excerpt.substring(0, 150);
        // Highlight keywords
        keywords.forEach(kw => {
          const re = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
          excerpt = excerpt.replace(re, '<mark>$1</mark>');
        });
        html += `<a href="${post.url}" class="md-search-result${i === 0 ? ' active' : ''}" data-index="${i}" tabindex="0">
          <div class="md-search-result__title">${this.escapeHtml(post.title || '')}</div>
          <div class="md-search-result__excerpt">${excerpt}...</div>
        </a>`;
      });

      this.results.innerHTML = html;
      this.activeIndex = 0;

      // Click handlers
      this.results.querySelectorAll('.md-search-result').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.close();
          window.location.href = el.href;
        });
      });
    },

    handleNav(e) {
      const items = this.results.querySelectorAll('.md-search-result');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
        this.updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.updateActive(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // If no item is actively selected, use the first result
        const targetIndex = this.activeIndex >= 0 ? this.activeIndex : 0;
        if (items[targetIndex]) {
          window.location.href = items[targetIndex].href;
        }
      }
    },

    updateActive(items) {
      items.forEach((el, i) => {
        el.classList.toggle('active', i === this.activeIndex);
      });
      items[this.activeIndex]?.scrollIntoView({ block: 'nearest' });
    },

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  // ===================================
  // Scroll Progress Bar (article pages)
  // ===================================
  const ScrollProgress = {
    bar: null,

    init() {
      // Only on article pages
      if (!document.querySelector('.post-article')) return;

      this.bar = document.createElement('div');
      this.bar.className = 'scroll-progress';
      document.body.appendChild(this.bar);

      window.addEventListener('scroll', () => {
        requestAnimationFrame(() => this.update());
      }, { passive: true });
      this.update();
    },

    update() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const pct = docHeight > 0 ? Math.min(100, (scrolled / docHeight) * 100) : 0;
      this.bar.style.width = pct + '%';
    }
  };

  // ===================================
  // Page Transition (fade-in on load)
  // ===================================
  const PageTransition = {
    init() {
      // Reveal page: the <head> has a style that hides body until .md-ready
      // is added to <html>. This prevents the flash-of-unstyled-content.
      requestAnimationFrame(() => {
        document.documentElement.classList.add('md-ready');
        // Now add a smooth fade-in on body
        document.body.style.transition = 'opacity 250ms ease';
        document.body.style.opacity = '1';
        // Clean up after transition
        setTimeout(() => {
          document.body.style.transition = '';
        }, 300);
      });

      // Prefetch on-hover for internal links
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) return;
        link.addEventListener('mouseenter', () => {
          const preload = document.createElement('link');
          preload.rel = 'prefetch';
          preload.href = href;
          preload.as = 'document';
          if (!document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
            document.head.appendChild(preload);
          }
        }, { once: true });
      });
    }
  };

  // ===================================
  // Keyboard Shortcuts (J/K for post navigation)
  // ===================================
  const KeyboardShortcuts = {
    init() {
      document.addEventListener('keydown', (e) => {
        // Don't intercept when typing in inputs
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        // Don't intercept when search dialog is open
        if (document.getElementById('search-dialog')?.classList.contains('open')) return;
        // Don't intercept when TOC panel is open
        if (document.getElementById('toc-panel')?.classList.contains('open')) return;

        // J = next post, K = previous post (on article pages)
        if (e.key === 'j' || e.key === 'k') {
          const navItems = document.querySelectorAll('.post-nav__item');
          if (navItems.length === 0) return;
          navItems.forEach(item => {
            const isPrev = item.classList.contains('post-nav__item--prev');
            if ((e.key === 'k' && isPrev) || (e.key === 'j' && !isPrev)) {
              window.location.href = item.href;
            }
          });
        }
      });
    }
  };

  // ===================================
  // Dark Mode Transition Animation
  // ===================================
  const DarkModeTransition = {
    init() {
      const toggle = document.getElementById('theme-toggle');
      if (!toggle) return;

      // Override the existing click handler to add animation
      // We wrap the ThemeManager.setTheme with animation
      const origSetTheme = ThemeManager.setTheme.bind(ThemeManager);
      ThemeManager.setTheme = function(theme, save) {
      if (document.startViewTransition && !Motion.reduced()) {
        const rect = toggle.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const maxRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );

        const transition = document.startViewTransition(() => {
          origSetTheme(theme, save);
        });

        transition.ready.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`
              ]
            },
            {
              duration: 520,
              easing: 'cubic-bezier(0.2, 0, 0, 1)',
              pseudoElement: '::view-transition-new(root)'
            }
          );
        }).catch(() => {});
      } else {
        origSetTheme(theme, save);
      }
      };
    }
  };

  // ===================================
  // Image Lazy Loading Enhancement
  // ===================================
  const LazyImages = {
    init() {
      // Add loading="lazy" to all post images that don't have it
      document.querySelectorAll('.post-content img:not([loading])').forEach(img => {
        img.loading = 'lazy';
      });

      // Add loading="lazy" to all post card covers
      document.querySelectorAll('.post-card__cover:not([loading])').forEach(img => {
        img.loading = 'lazy';
      });
    }
  };

  // ===================================
  // Responsive Content Enhancements
  // ===================================
  const ResponsiveContent = {
    init() {
      document.querySelectorAll('.post-content table').forEach(table => {
        if (table.parentElement?.classList.contains('table-scroll')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-scroll';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
    }
  };

  // ===================================
  // Loading Overlay (移植自个人主页)
  // ===================================
  const LoadingOverlay = {
    overlay: null,
    loadingAnimation: null,
    overlayTimer: null,
    startTime: 0,
    minDuration: 1200,

    init() {
      this.overlay = document.getElementById('loading-overlay');
      if (!this.overlay) return;

      this.startTime = performance.now();

      // Init Lottie "Now Loading..." animation
      this.initLottie();

      const hideOverlay = () => {
        if (this.loadingAnimation) {
          this.loadingAnimation.destroy();
          this.loadingAnimation = null;
        }
        clearTimeout(this.overlayTimer);
        const elapsed = performance.now() - this.startTime;
        const delay = Math.max(0, this.minDuration - elapsed);
        this.overlayTimer = setTimeout(() => {
          this.overlay.classList.add('loaded');
          setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
          }, 520);
        }, delay);
      };

      if (document.readyState === 'complete') {
        hideOverlay();
      } else {
        window.addEventListener('load', hideOverlay, { once: true });
        // Fallback: hide after 5s
        setTimeout(hideOverlay, 5000);
      }
    },

    initLottie() {
      const container = document.getElementById('loading-text');
      if (!container || typeof lottie === 'undefined') return;
      const fallback = container.querySelector('.loading-overlay__fallback-text');

      fetch('https://millionlive-theaterdays.idolmaster-official.jp/assets/data/lottie/loading.json')
        .then(response => {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(animationData => {
          this.loadingAnimation = lottie.loadAnimation({
            container,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData
          });
          if (fallback) {
            this.loadingAnimation.addEventListener('DOMLoaded', () => {
              fallback.style.display = 'none';
            });
          }
        })
        .catch(() => {
          // Keep fallback text visible if Lottie fails
          if (fallback) fallback.style.display = 'block';
        });
    }
  };

  // ===================================
  // Scroll Reveal Animation
  // ===================================
  const ScrollReveal = {
    observer: null,

    init() {
      const items = document.querySelectorAll('.reveal, .reveal-stagger');
      if (items.length === 0) return;

      // If IntersectionObserver not supported, just show everything
      if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('in'));
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      });

      items.forEach(el => this.observer.observe(el));
    }
  };

  // ===================================
  // Initialize Everything
  // ===================================
  function init() {
    LoadingOverlay.init();
    ThemeManager.init();
    HeaderScroll.init();
    MobileDrawer.init();
    BackToTop.init();
    TableOfContents.init();
    CodeHighlight.init();
    MathRenderer.init();
    ImagePreview.init();
    ShuoshuoPagination.init();
    SmoothScroll.init();
    SearchDialog.init();
    ScrollProgress.init();
    PageTransition.init();
    KeyboardShortcuts.init();
    DarkModeTransition.init();
    LazyImages.init();
    ResponsiveContent.init();
    ScrollReveal.init();

    // Add entrance animation to main content
    const main = document.querySelector('.main-content');
    if (main) {
      main.classList.add('fade-in');
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
