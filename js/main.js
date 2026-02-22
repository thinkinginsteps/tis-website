import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', async () => {

    // ─── MOBILE MENU ──────────────────────────────────────────────────────────
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    function toggleMenu(open) {
        menuBtn.classList.toggle('open', open);
        mobileMenu.classList.toggle('open', open);
        mobileMenu.setAttribute('aria-hidden', String(!open));
        document.body.style.overflow = open ? 'hidden' : '';
    }

    menuBtn.addEventListener('click', () => toggleMenu(!menuBtn.classList.contains('open')));

    // Close on nav link click
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => toggleMenu(false));
    });

    // ─── SCROLL REVEAL ────────────────────────────────────────────────────────
    const revealObserver = new IntersectionObserver((entries, self) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                if (entry.target.classList.contains('stagger-children')) {
                    entry.target.querySelectorAll('.hidden-element').forEach((child, i) => {
                        setTimeout(() => child.classList.add('show'), i * 150);
                    });
                }
                self.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.15 });

    const observeElements = () => {
        document.querySelectorAll('.hidden-element:not(.stagger-children .hidden-element)')
            .forEach(el => revealObserver.observe(el));
        document.querySelectorAll('.stagger-children')
            .forEach(el => revealObserver.observe(el));
    };
    observeElements();

    // ─── HEADER BLUR ──────────────────────────────────────────────────────────
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('shadow-sm', window.scrollY > 20);
    });

    // ─── SMOOTH SCROLLING ─────────────────────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
            const target = document.querySelector(targetId);
            if (target) {
                const offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: offset, behavior: 'smooth' });
            }
        });
    });

    // ─── FETCH PROJECTS FROM SUPABASE ─────────────────────────────────────────
    const grid = document.getElementById('projects-grid');
    const loadingEl = document.getElementById('projects-loading');

    const { data: projectsList, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (loadingEl) loadingEl.remove();

    if (error) {
        console.error('Could not load projects:', error.message);
        const errEl = document.createElement('div');
        errEl.className = 'col-span-full flex items-center justify-center py-16 bg-white text-xs font-mono text-gray-400';
        errEl.textContent = 'Could not load projects.';
        if (grid) grid.appendChild(errEl);
        return;
    }

    // Non-STEALTH first (by sort_order), STEALTH always last (by sort_order)
    const projects = (projectsList || []).sort((a, b) => {
        const aS = a.status_label === 'STEALTH' ? 1 : 0;
        const bS = b.status_label === 'STEALTH' ? 1 : 0;
        if (aS !== bS) return aS - bS;
        return a.sort_order - b.sort_order;
    });
    const projectsMap = {};

    // ─── RENDER PROJECT CARDS ─────────────────────────────────────────────────
    projects.forEach(project => {
        projectsMap[project.slug] = project;

        const card = document.createElement('div');
        const isStealth = project.status_label === 'STEALTH';

        if (isStealth) {
            // Use admin-set build_progress; fall back to slug-derived value if not set
            const buildPct = (project.build_progress != null && project.build_progress > 0)
                ? project.build_progress
                : (project.slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 55) + 20;

            card.className = 'project-card relative hidden-element';
            card.style.backgroundColor = '#f7f7f7';
            card.dataset.id = project.slug;
            card.dataset.stealth = 'true';
            card.innerHTML = `
                <div class="p-8 flex flex-col items-center justify-center text-center h-full min-h-[340px] relative">

                    <!-- Status badge (unchanged) -->
                    <div class="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 border border-gray-200 bg-gray-50 text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                        <span class="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse"></span>
                        Building
                    </div>

                    <!-- Icon -->
                    <div class="w-10 h-10 border border-dashed border-gray-400 flex items-center justify-center text-gray-500 mb-5">
                        <span class="material-symbols-outlined text-xl">${escHtml(project.icon || 'science')}</span>
                    </div>

                    <!-- Title (unchanged) -->
                    <h3 class="text-sm font-bold text-gray-500 mb-6">${escHtml(project.title)}</h3>

                    <!-- Build progress -->
                    <div class="w-full max-w-[180px]">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Build</span>
                            <span class="text-[9px] font-mono text-gray-500">${buildPct}%</span>
                        </div>
                        <div class="w-full h-[3px] bg-gray-200">
                            <div class="h-full bg-gray-400" style="width:${buildPct}%;"></div>
                        </div>
                    </div>

                    <!-- Label -->
                    <p class="text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em] mt-5">In Development</p>

                </div>
            `;
        } else {
            card.className = 'project-card group relative bg-white hover:bg-gray-50 transition-all duration-300 cursor-pointer hidden-element';
            card.dataset.id = project.slug;
            card.innerHTML = `
                <div class="p-8 flex flex-col justify-between h-full min-h-[340px]">
                    <div>
                        <div class="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="mb-6 flex justify-between items-start">
                            <div class="w-10 h-10 border border-gray-200 flex items-center justify-center text-neutral-dark transition-colors group-hover:border-primary">
                                <span class="material-symbols-outlined text-xl">${escHtml(project.icon || 'code')}</span>
                            </div>
                            <span class="flex h-2 w-2 rounded-full bg-primary ring-4 ring-primary/10"></span>
                        </div>
                        <h3 class="text-base font-bold mb-2 group-hover:text-primary transition-colors">${escHtml(project.title)}</h3>
                        <p class="text-gray-500 text-xs leading-relaxed">${escHtml(project.description || '')}</p>
                    </div>
                    <div class="flex items-center gap-3 text-[10px] font-mono text-gray-400 pt-5 border-t border-gray-100 mt-6">
                        ${project.version ? `<span>${escHtml(project.version)}</span><span class="w-px h-3 bg-gray-300"></span>` : ''}
                        <span>${escHtml(project.status_label || 'ACTIVE')}</span>
                    </div>
                </div>
            `;
        }

        if (grid) grid.appendChild(card);
    });

    // Observe newly added cards for scroll reveal
    grid.querySelectorAll('.hidden-element').forEach(el => revealObserver.observe(el));

    // ─── FILL EMPTY GRID SLOTS ────────────────────────────────────────────────
    // Prevents raw grey gaps in the last row (desktop: 3-col layout)
    const totalCards = grid.querySelectorAll('.project-card').length;
    const fillCount = (3 - (totalCards % 3)) % 3;

    for (let i = 0; i < fillCount; i++) {
        const filler = document.createElement('div');
        filler.className = 'relative bg-white min-h-[340px] hidden md:flex items-center justify-center overflow-hidden';
        filler.innerHTML = `
            <div class="absolute inset-0 pointer-events-none" style="background-image: linear-gradient(rgba(240,240,240,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(240,240,240,0.8) 1px, transparent 1px); background-size: 28px 28px;"></div>
            <div class="absolute top-5 left-5 w-4 h-4 border-t border-l border-gray-200"></div>
            <div class="absolute top-5 right-5 w-4 h-4 border-t border-r border-gray-200"></div>
            <div class="absolute bottom-5 left-5 w-4 h-4 border-b border-l border-gray-200"></div>
            <div class="absolute bottom-5 right-5 w-4 h-4 border-b border-r border-gray-200"></div>
            <div class="relative text-center">
                <div class="text-[9px] font-mono text-gray-300 uppercase tracking-[0.25em] mb-3">slot.queued</div>
                <div class="flex items-center gap-1 justify-center">
                    <span class="font-mono text-primary opacity-30 text-xs">&gt;</span>
                    <span class="text-[11px] font-mono text-gray-300 tracking-wide">initializing</span>
                    <span class="font-mono text-primary opacity-40 animate-pulse text-sm leading-none">_</span>
                </div>
            </div>
        `;
        grid.appendChild(filler);
    }

    // ─── PANEL ELEMENTS ───────────────────────────────────────────────────────
    const panel = document.getElementById('project-expansion-panel');
    const panelTitle = document.getElementById('panel-title');
    const panelDesc = document.getElementById('panel-desc');
    const panelTags = document.getElementById('panel-tags');
    const panelLink = document.getElementById('panel-link');
    const panelLinkTx = document.getElementById('panel-link-text');
    const panelMeta = document.getElementById('panel-meta');
    const panelIcon = document.getElementById('panel-icon');
    const floatingCloseBtn = document.getElementById('floating-panel-close-btn');
    const showcasePlaceholder = document.getElementById('showcase-placeholder');
    const showcaseGallery = document.getElementById('showcase-gallery');

    let activeId = null;

    // ── Close button positioning ───────────────────────────────────────────────
    function updateCloseBtnPosition() {
        if (!activeId || !floatingCloseBtn) return;
        const panelRect = panel.getBoundingClientRect();
        const headerH = 80;
        const padding = 32;
        const rightPx = window.innerWidth - panelRect.right + padding;
        const topPx = Math.max(headerH + padding, panelRect.top + padding);
        const panelVisible = panelRect.bottom > headerH + padding + 40;
        floatingCloseBtn.style.top = topPx + 'px';
        floatingCloseBtn.style.right = rightPx + 'px';
        floatingCloseBtn.style.opacity = panelVisible ? '1' : '0';
        floatingCloseBtn.style.pointerEvents = panelVisible ? 'auto' : 'none';
    }

    window.addEventListener('scroll', updateCloseBtnPosition);
    window.addEventListener('resize', updateCloseBtnPosition);

    // ── Populate sidebar ───────────────────────────────────────────────────────
    function populatePanel(project) {
        [panelTitle, panelDesc, panelLink].forEach(el => el.style.opacity = '0');
        const delay = activeId ? 200 : 0;
        setTimeout(() => {
            panelIcon.textContent = project.icon || 'code';
            panelTitle.textContent = project.title;
            panelDesc.textContent = project.description || '';

            panelTags.innerHTML = (project.tags || []).map(t =>
                `<span class="px-3 py-1 bg-white border border-gray-200 text-xs font-mono text-gray-500">${escHtml(t)}</span>`
            ).join('');

            if (project.link_text) {
                panelLink.style.display = '';
                panelLinkTx.textContent = project.link_text;
                panelLink.href = project.link_href || '#';
            } else {
                panelLink.style.display = 'none';
            }

            const dotColor = project.status_label === 'INTERNAL'
                ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]'
                : 'bg-primary shadow-[0_0_8px_rgba(255,132,0,0.5)]';
            panelMeta.innerHTML = `
                <div class="text-xs font-mono text-gray-400 uppercase tracking-wider mb-3">Status</div>
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full ${dotColor}"></div>
                    <span class="text-sm font-bold text-neutral-dark">${escHtml(project.status_label || 'ACTIVE')}${project.version ? ' · ' + escHtml(project.version) : ''}</span>
                </div>
            `;

            setTimeout(() => {
                panelTitle.style.opacity = '1';
                panelDesc.style.opacity = '1';
                panelLink.style.opacity = '1';
            }, 50);
        }, delay);
    }

    // ── Populate image showcase ────────────────────────────────────────────────
    function populateShowcase(project) {
        const allImages = [];
        if (project.cover_url) allImages.push(project.cover_url);
        if (project.gallery_urls && project.gallery_urls.length > 0) {
            allImages.push(...project.gallery_urls);
        }

        if (allImages.length === 0) {
            showcasePlaceholder.style.display = 'flex';
            showcaseGallery.classList.add('hidden');
            showcaseGallery.innerHTML = '';
            return;
        }

        showcasePlaceholder.style.display = 'none';
        showcaseGallery.classList.remove('hidden');
        showcaseGallery.innerHTML = allImages.map((url, i) => `
            <div class="overflow-hidden showcase-img"
                style="opacity:0; transform:translateY(16px); transition: opacity 0.5s ${i * 0.08}s ease, transform 0.5s ${i * 0.08}s ease;">
                <img src="${url}" alt="${escHtml(project.title)}"
                    class="w-full object-cover border border-gray-100 shadow-sm">
            </div>
        `).join('');

        setTimeout(() => {
            showcaseGallery.querySelectorAll('.showcase-img').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }, 100);
    }

    // ── Open panel ─────────────────────────────────────────────────────────────
    function openPanel(id) {
        const project = projectsMap[id];
        if (!project) return;

        activeId = id;
        populatePanel(project);
        populateShowcase(project);

        panel.style.maxHeight = '4000px';
        panel.style.opacity = '1';
        panel.style.marginBottom = '0';

        if (grid) {
            grid.style.marginTop = '0';
            grid.style.borderTop = 'none';
        }

        setTimeout(() => {
            const offset = panel.getBoundingClientRect().top + window.pageYOffset - 88;
            window.scrollTo({ top: offset, behavior: 'smooth' });
        }, 80);

        setTimeout(() => {
            if (activeId === id) panel.style.overflow = 'visible';
            updateCloseBtnPosition();
        }, 800);
    }

    // ── Close panel ────────────────────────────────────────────────────────────
    function closePanel() {
        activeId = null;
        panel.style.overflow = 'hidden';
        panel.style.maxHeight = '0';
        panel.style.opacity = '0';
        floatingCloseBtn.style.opacity = '0';
        floatingCloseBtn.style.pointerEvents = 'none';

        if (grid) {
            grid.style.marginTop = '';
            grid.style.borderTop = '';
        }

        const projectsHeader = document.getElementById('projects-header');
        if (projectsHeader) {
            const offset = projectsHeader.getBoundingClientRect().top + window.pageYOffset - 88;
            window.scrollTo({ top: offset, behavior: 'smooth' });
        }
    }

    // ── Card click (event delegation for dynamically rendered cards) ──────────
    if (grid) {
        grid.addEventListener('click', function (e) {
            const card = e.target.closest('.project-card');
            if (!card) return;
            if (card.dataset.stealth) return;
            if (e.target.closest('a') || e.target.closest('button')) return;
            const id = card.dataset.id;
            if (id === activeId) {
                closePanel();
            } else {
                openPanel(id);
            }
        });
    }

    // ── Floating close button ──────────────────────────────────────────────────
    if (floatingCloseBtn) {
        floatingCloseBtn.addEventListener('click', closePanel);
    }

    // ─── CONTACT FORM (Web3Forms) ──────────────────────────────────────────────
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const submitBtn = document.getElementById('contact-submit');
        const statusEl = document.getElementById('contact-status');

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Check reCAPTCHA is completed
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                statusEl.textContent = '✕ Please complete the reCAPTCHA check.';
                statusEl.classList.remove('hidden', 'text-green-400');
                statusEl.classList.add('text-red-400');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending…';
            statusEl.className = 'text-sm font-mono text-center py-2';
            statusEl.textContent = '';
            statusEl.classList.add('hidden');

            try {
                const res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: new FormData(contactForm),
                });
                const data = await res.json();

                if (data.success) {
                    contactForm.reset();
                    grecaptcha.reset();
                    statusEl.textContent = '✓ Message sent — we\'ll be in touch soon.';
                    statusEl.classList.remove('hidden', 'text-red-400');
                    statusEl.classList.add('text-green-400');
                } else {
                    throw new Error(data.message || 'Server error');
                }
            } catch {
                statusEl.textContent = '✕ Something went wrong. Please try again.';
                statusEl.classList.remove('hidden', 'text-green-400');
                statusEl.classList.add('text-red-400');
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        });
    }
});
