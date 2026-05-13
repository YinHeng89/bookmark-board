/**
 * 书签白板官网交互逻辑
 * 功能：导航栏滚动效果、移动端菜单、平滑滚动、淡入动画
 */

document.addEventListener('DOMContentLoaded', () => {
  // 初始化所有交互功能
  initNavbar();
  initMobileMenu();
  initSmoothScroll();
  initFadeInAnimation();
  initLanguageSwitcher();
});

/**
 * 导航栏滚动效果
 * 滚动时添加阴影和背景变化
 */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  
  if (!navbar) return;
  
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // 添加/移除滚动样式
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });
}

/**
 * 移动端菜单切换
 */
function initMobileMenu() {
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('navMenu');
  
  if (!menuToggle || !navMenu) return;
  
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    
    // 动画化菜单按钮
    const spans = menuToggle.querySelectorAll('span');
    if (navMenu.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });
  
  // 点击导航链接后关闭菜单
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      
      // 重置菜单按钮
      const spans = menuToggle.querySelectorAll('span');
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    });
  });
  
  // 点击页面其他地方关闭菜单
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
      navMenu.classList.remove('active');
      
      const spans = menuToggle.querySelectorAll('span');
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });
}

/**
 * 平滑滚动到锚点
 */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      // 忽略空锚点
      if (href === '#' || href === '#!') return;
      
      const target = document.querySelector(href);
      
      if (target) {
        e.preventDefault();
        
        const navHeight = document.getElementById('navbar')?.offsetHeight || 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * 淡入动画 - 使用 Intersection Observer API
 * 元素进入视口时触发淡入效果
 */
function initFadeInAnimation() {
  const fadeElements = document.querySelectorAll('.fade-in');
  
  if (fadeElements.length === 0) return;
  
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // 添加延迟以实现交错动画效果
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 100);
        
        // 动画完成后停止观察
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  fadeElements.forEach(element => {
    observer.observe(element);
  });
}

/**
 * 工具函数：节流
 * 限制函数执行频率
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 工具函数：防抖
 * 延迟执行函数，如果在延迟期间再次调用则重新计时
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 语言切换功能
 * 支持中文/英文切换
 */
function initLanguageSwitcher() {
  const langSwitcher = document.getElementById('langSwitcher');
  if (!langSwitcher) return;
  
  const langBtns = langSwitcher.querySelectorAll('.lang-btn');
  
  // 翻译字典
  const translations = {
    zh: {
      // Meta 标签
      'meta-title': '书签白板 - 隐私优先的卡片式书签管理工具',
      'meta-description': '书签白板 - 隐私优先的卡片式书签管理工具，拖拽添加、智能分组、侧边栏快速访问，完全离线可用',
      'meta-keywords': '书签管理, 书签工具, 网页收藏, 链接管理, 本地存储, 隐私保护, 离线可用, Chrome扩展',
      'og-title': '书签白板 - 隐私优先的卡片式书签管理工具',
      'og-description': '像画板一样管理你的网络资源！拖拽添加、智能分组、卡片式布局、侧边栏快速访问',
      
      // 导航栏
      'nav-brand': '书签白板',
      'nav-features': '核心特性',
      'nav-use-cases': '使用场景',
      'nav-install': '安装使用',
      'nav-tech': '技术架构',
      
      // Hero 区域
      'hero-title': '书签白板',
      'hero-subtitle': '隐私优先的卡片式书签管理工具',
      'hero-description': '像画板一样管理你的网络资源！拖拽添加、智能分组、卡片式布局、侧边栏快速访问，完全离线可用，保护你的隐私。',
      'mockup-title': '书签白板',
      'mockup-card-1': '学习资料',
      'mockup-card-2': '工作项目',
      'mockup-card-3': '购物清单',
      'mockup-card-4': '设计灵感',
      'hero-stats-local': '本地存储',
      'hero-stats-network': '网络请求',
      'hero-stats-methods': '添加方式',
      
      // 核心特性
      'section-features': '核心特性',
      'section-features-subtitle': '强大而简洁的书签管理体验',
      'feature-1-title': '多场景添加',
      'feature-1-desc': '拖拽添加、右键菜单、手动输入、侧边栏一键添加，5种方式快速保存网页',
      'feature-2-title': '高效管理',
      'feature-2-desc': '卡片式布局、实时搜索、批量操作、智能排序，让整理变得轻松愉快',
      'feature-3-title': '智能分组',
      'feature-3-desc': '手动分组、自动分类、分组筛选，多层级组织你的书签集合',
      'feature-4-title': '侧边栏',
      'feature-4-desc': '快速访问、实时同步、移动端样式，浏览网页时随时管理书签',
      'feature-5-title': '现代界面',
      'feature-5-desc': '深色/浅色主题、响应式设计、流畅动画，视觉体验舒适优雅',
      'feature-6-title': '隐私保护',
      'feature-6-desc': '完全本地存储、无需联网、数据自主，你的数据完全由你掌控',
      
      // 使用场景
      'section-use-cases': '使用场景',
      'section-use-cases-subtitle': '适合各种书签管理需求',
      'use-case-1-title': '学习研究',
      'use-case-1-desc': '整理学习资料、论文参考文献、在线课程链接，构建个人知识库',
      'use-case-2-title': '项目管理',
      'use-case-2-desc': '按项目分类保存相关页面，团队成员共享参考资料',
      'use-case-3-title': '购物比价',
      'use-case-3-desc': '保存商品页面方便对比，整理购物清单和优惠信息',
      'use-case-4-title': '资料收集',
      'use-case-4-desc': '整理研究资料和参考链接，收藏优质内容和灵感来源',
      'use-case-1-li-1': '✓ 按科目分类整理',
      'use-case-1-li-2': '✓ 快速搜索查找',
      'use-case-1-li-3': '✓ 随时添加新资源',
      'use-case-2-li-1': '✓ 项目分组管理',
      'use-case-2-li-2': '✓ 置顶重要链接',
      'use-case-2-li-3': '✓ 快速访问常用工具',
      'use-case-3-li-1': '✓ 商品链接收集',
      'use-case-3-li-2': '✓ 价格对比整理',
      'use-case-3-li-3': '✓ 促销活动追踪',
      'use-case-4-li-1': '✓ 文章链接收藏',
      'use-case-4-li-2': '✓ 参考资料整理',
      'use-case-4-li-3': '✓ 灵感创意收集',
      
      // 安装引导
      'section-install': '3 步开始使用',
      'section-install-subtitle': '简单快速，即刻体验',
      'install-step-1-title': '获取扩展',
      'install-step-1-desc': '从 Chrome 商店安装，或从 GitHub 下载源代码',
      'install-step-2-title': '加载到 Chrome',
      'install-step-2-desc': '打开 chrome://extensions/，开启开发者模式，加载已解压的扩展程序',
      'install-step-3-title': '开始整理',
      'install-step-3-desc': '打开新标签页即可看到书签白板，开始拖拽添加你的第一个书签！',
      
      // 技术架构
      'section-tech': '技术架构',
      'section-tech-subtitle': '轻量、快速、无依赖',
      'tech-1-title': 'Manifest V3',
      'tech-1-desc': '最新 Chrome 扩展标准',
      'tech-2-title': '原生 CSS',
      'tech-2-desc': 'CSS Variables 主题系统',
      'tech-3-title': 'JavaScript ES6+',
      'tech-3-desc': '现代交互逻辑',
      'tech-4-title': '零依赖',
      'tech-4-desc': '无需外部库，轻量快速',
      'tech-5-title': 'Chrome Storage',
      'tech-5-desc': '本地数据安全存储',
      'tech-6-title': '离线可用',
      'tech-6-desc': '无需网络连接',
      
      // 页脚
      'footer-project': '项目',
      'footer-resources': '资源',
      'footer-license-title': '许可证',
      'footer-link-github': 'GitHub 仓库',
      'footer-link-guide': '使用文档',
      'footer-link-issues': '问题反馈',
      'footer-link-changelog': '更新日志',
      'footer-link-chrome-docs': 'Chrome 扩展文档',
      'footer-link-privacy': '隐私政策',
      'footer-link-about': '项目说明',
      'footer-license-desc': '本项目采用 <a href="https://opensource.org/licenses/MIT" target="_blank">MIT 许可证</a><br>完全开源，可自由使用和修改',
      'footer-copyright': '&copy; 2026 书签白板 Bookmark Board. 保留所有权利。',
      'footer-made-with': '用 ❤️ 打造，让书签管理更简单'
    },
    en: {
      // Meta Tags
      'meta-title': 'Bookmark Board - Privacy-First Visual Bookmark Manager',
      'meta-description': 'Bookmark Board - Privacy-first visual bookmark manager with drag-and-drop, smart grouping, sidebar access, 100% offline',
      'meta-keywords': 'bookmark manager, bookmark tool, web collection, link management, local storage, privacy protection, offline, Chrome extension',
      'og-title': 'Bookmark Board - Privacy-First Visual Bookmark Manager',
      'og-description': 'Manage your web resources like a canvas! Drag-and-drop, smart grouping, card layout, sidebar quick access',
      
      // Navigation
      'nav-brand': 'Bookmark Board',
      'nav-features': 'Features',
      'nav-use-cases': 'Use Cases',
      'nav-install': 'Install',
      'nav-tech': 'Tech Stack',
      
      // Hero Section
      'hero-title': 'Bookmark Board',
      'hero-subtitle': 'Privacy-First Visual Bookmark Manager',
      'hero-description': 'Manage your web resources like a canvas! Drag-and-drop, smart grouping, card layout, sidebar access, 100% offline, privacy protected.',
      'mockup-title': 'Bookmark Board',
      'mockup-card-1': 'Study Materials',
      'mockup-card-2': 'Work Projects',
      'mockup-card-3': 'Shopping List',
      'mockup-card-4': 'Design Inspiration',
      'hero-stats-local': 'Local Storage',
      'hero-stats-network': 'Network Requests',
      'hero-stats-methods': 'Add Methods',
      
      // Features
      'section-features': 'Core Features',
      'section-features-subtitle': 'Powerful yet simple bookmark management',
      'feature-1-title': 'Multiple Add Methods',
      'feature-1-desc': 'Drag-and-drop, context menu, manual input, sidebar one-click - 5 ways to save pages quickly',
      'feature-2-title': 'Efficient Management',
      'feature-2-desc': 'Card layout, real-time search, batch operations, smart sorting, make organizing enjoyable',
      'feature-3-title': 'Smart Grouping',
      'feature-3-desc': 'Manual groups, auto classification, group filtering, multi-level organization',
      'feature-4-title': 'Sidebar',
      'feature-4-desc': 'Quick access, real-time sync, mobile-friendly design, manage bookmarks while browsing',
      'feature-5-title': 'Modern Interface',
      'feature-5-desc': 'Dark/light themes, responsive design, smooth animations, elegant visual experience',
      'feature-6-title': 'Privacy Protection',
      'feature-6-desc': '100% local storage, no internet required, full data control, your data stays yours',
      
      // Use Cases
      'section-use-cases': 'Use Cases',
      'section-use-cases-subtitle': 'Perfect for all bookmark management needs',
      'use-case-1-title': 'Learning & Research',
      'use-case-1-desc': 'Organize study materials, paper references, online courses, build personal knowledge base',
      'use-case-2-title': 'Project Management',
      'use-case-2-desc': 'Save pages by project, share reference materials with team members',
      'use-case-3-title': 'Shopping Comparison',
      'use-case-3-desc': 'Save product pages for comparison, organize shopping lists and deals',
      'use-case-4-title': 'Resource Collection',
      'use-case-4-desc': 'Collect research materials and references, bookmark quality content and inspiration',
      'use-case-1-li-1': '✓ Organize by subject',
      'use-case-1-li-2': '✓ Quick search and find',
      'use-case-1-li-3': '✓ Add new resources anytime',
      'use-case-2-li-1': '✓ Project group management',
      'use-case-2-li-2': '✓ Pin important links',
      'use-case-2-li-3': '✓ Quick access to common tools',
      'use-case-3-li-1': '✓ Product link collection',
      'use-case-3-li-2': '✓ Price comparison',
      'use-case-3-li-3': '✓ Track promotions and deals',
      'use-case-4-li-1': '✓ Article link bookmarking',
      'use-case-4-li-2': '✓ Reference material organization',
      'use-case-4-li-3': '✓ Inspiration and idea collection',
      
      // Installation
      'section-install': 'Get Started in 3 Steps',
      'section-install-subtitle': 'Simple and fast, start now',
      'install-step-1-title': 'Get the Extension',
      'install-step-1-desc': 'Install from Chrome Web Store, or download source code from GitHub',
      'install-step-2-title': 'Load to Chrome',
      'install-step-2-desc': 'Open chrome://extensions/, enable Developer Mode, load unpacked extension',
      'install-step-3-title': 'Start Organizing',
      'install-step-3-desc': 'Open a new tab to see Bookmark Board, start drag-and-dropping your first bookmark!',
      
      // Tech Stack
      'section-tech': 'Tech Stack',
      'section-tech-subtitle': 'Lightweight, fast, zero dependencies',
      'tech-1-title': 'Manifest V3',
      'tech-1-desc': 'Latest Chrome extension standard',
      'tech-2-title': 'Vanilla CSS',
      'tech-2-desc': 'CSS Variables theming system',
      'tech-3-title': 'JavaScript ES6+',
      'tech-3-desc': 'Modern interaction logic',
      'tech-4-title': 'Zero Dependencies',
      'tech-4-desc': 'No external libraries, lightweight',
      'tech-5-title': 'Chrome Storage',
      'tech-5-desc': 'Local secure data storage',
      'tech-6-title': 'Offline Available',
      'tech-6-desc': 'No internet connection required',
      
      // Footer
      'footer-project': 'Project',
      'footer-resources': 'Resources',
      'footer-license-title': 'License',
      'footer-link-github': 'GitHub Repository',
      'footer-link-guide': 'Documentation',
      'footer-link-issues': 'Issue Tracker',
      'footer-link-changelog': 'Changelog',
      'footer-link-chrome-docs': 'Chrome Extension Docs',
      'footer-link-privacy': 'Privacy Policy',
      'footer-link-about': 'About Project',
      'footer-license-desc': 'This project is licensed under the <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a><br>Completely open source, free to use and modify',
      'footer-copyright': '&copy; 2026 Bookmark Board. All rights reserved.',
      'footer-made-with': 'Made with ❤️ for simpler bookmark management'
    }
  };
  
  // 获取当前语言（从 localStorage 或默认中文）
  let currentLang = localStorage.getItem('bookmark-board-lang') || 'zh';
  
  // 应用语言
  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('bookmark-board-lang', lang);
    
    const t = translations[lang];
    
    // 更新 Meta 标签
    document.title = t['meta-title'];
    const metaDesc = document.querySelector('meta[name="description"]');
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    
    if (metaDesc) metaDesc.content = t['meta-description'];
    if (metaKeywords) metaKeywords.content = t['meta-keywords'];
    if (ogTitle) ogTitle.content = t['og-title'];
    if (ogDesc) ogDesc.content = t['og-description'];
    
    // 更新导航栏
    updateText('nav-brand', t['nav-brand']);
    updateText('nav-features', t['nav-features']);
    updateText('nav-use-cases', t['nav-use-cases']);
    updateText('nav-install', t['nav-install']);
    updateText('nav-tech', t['nav-tech']);
    
    // 更新 Hero 区域
    updateText('hero-title', t['hero-title']);
    updateText('hero-subtitle', t['hero-subtitle']);
    updateHtml('hero-description', t['hero-description']);
    updateText('mockup-title', t['mockup-title']);
    updateText('mockup-card-1', t['mockup-card-1']);
    updateText('mockup-card-2', t['mockup-card-2']);
    updateText('mockup-card-3', t['mockup-card-3']);
    updateText('mockup-card-4', t['mockup-card-4']);
    updateText('hero-stats-local', t['hero-stats-local']);
    updateText('hero-stats-network', t['hero-stats-network']);
    updateText('hero-stats-methods', t['hero-stats-methods']);
    
    // 更新特性区域
    updateText('section-features', t['section-features']);
    updateText('section-features-subtitle', t['section-features-subtitle']);
    updateText('feature-1-title', t['feature-1-title']);
    updateHtml('feature-1-desc', t['feature-1-desc']);
    updateText('feature-2-title', t['feature-2-title']);
    updateHtml('feature-2-desc', t['feature-2-desc']);
    updateText('feature-3-title', t['feature-3-title']);
    updateHtml('feature-3-desc', t['feature-3-desc']);
    updateText('feature-4-title', t['feature-4-title']);
    updateHtml('feature-4-desc', t['feature-4-desc']);
    updateText('feature-5-title', t['feature-5-title']);
    updateHtml('feature-5-desc', t['feature-5-desc']);
    updateText('feature-6-title', t['feature-6-title']);
    updateHtml('feature-6-desc', t['feature-6-desc']);
    
    // 更新使用场景
    updateText('section-use-cases', t['section-use-cases']);
    updateText('section-use-cases-subtitle', t['section-use-cases-subtitle']);
    updateText('use-case-1-title', t['use-case-1-title']);
    updateHtml('use-case-1-desc', t['use-case-1-desc']);
    updateText('use-case-2-title', t['use-case-2-title']);
    updateHtml('use-case-2-desc', t['use-case-2-desc']);
    updateText('use-case-3-title', t['use-case-3-title']);
    updateHtml('use-case-3-desc', t['use-case-3-desc']);
    updateText('use-case-4-title', t['use-case-4-title']);
    updateHtml('use-case-4-desc', t['use-case-4-desc']);
    
    // 更新使用场景列表
    updateText('use-case-1-li-1', t['use-case-1-li-1']);
    updateText('use-case-1-li-2', t['use-case-1-li-2']);
    updateText('use-case-1-li-3', t['use-case-1-li-3']);
    updateText('use-case-2-li-1', t['use-case-2-li-1']);
    updateText('use-case-2-li-2', t['use-case-2-li-2']);
    updateText('use-case-2-li-3', t['use-case-2-li-3']);
    updateText('use-case-3-li-1', t['use-case-3-li-1']);
    updateText('use-case-3-li-2', t['use-case-3-li-2']);
    updateText('use-case-3-li-3', t['use-case-3-li-3']);
    updateText('use-case-4-li-1', t['use-case-4-li-1']);
    updateText('use-case-4-li-2', t['use-case-4-li-2']);
    updateText('use-case-4-li-3', t['use-case-4-li-3']);
    
    // 更新安装引导
    updateText('section-install', t['section-install']);
    updateText('section-install-subtitle', t['section-install-subtitle']);
    updateText('install-step-1-title', t['install-step-1-title']);
    updateHtml('install-step-1-desc', t['install-step-1-desc']);
    updateText('install-step-2-title', t['install-step-2-title']);
    updateHtml('install-step-2-desc', t['install-step-2-desc']);
    updateText('install-step-3-title', t['install-step-3-title']);
    updateHtml('install-step-3-desc', t['install-step-3-desc']);
    
    // 更新技术架构
    updateText('section-tech', t['section-tech']);
    updateText('section-tech-subtitle', t['section-tech-subtitle']);
    updateText('tech-1-title', t['tech-1-title']);
    updateHtml('tech-1-desc', t['tech-1-desc']);
    updateText('tech-2-title', t['tech-2-title']);
    updateHtml('tech-2-desc', t['tech-2-desc']);
    updateText('tech-3-title', t['tech-3-title']);
    updateHtml('tech-3-desc', t['tech-3-desc']);
    updateText('tech-4-title', t['tech-4-title']);
    updateHtml('tech-4-desc', t['tech-4-desc']);
    updateText('tech-5-title', t['tech-5-title']);
    updateHtml('tech-5-desc', t['tech-5-desc']);
    updateText('tech-6-title', t['tech-6-title']);
    updateHtml('tech-6-desc', t['tech-6-desc']);
    
    // 更新页脚
    updateText('footer-project', t['footer-project']);
    updateText('footer-resources', t['footer-resources']);
    updateText('footer-license-title', t['footer-license-title']);
    updateText('footer-link-github', t['footer-link-github']);
    updateText('footer-link-guide', t['footer-link-guide']);
    updateText('footer-link-issues', t['footer-link-issues']);
    updateText('footer-link-changelog', t['footer-link-changelog']);
    updateText('footer-link-chrome-docs', t['footer-link-chrome-docs']);
    updateText('footer-link-privacy', t['footer-link-privacy']);
    updateText('footer-link-about', t['footer-link-about']);
    updateHtml('footer-license-desc', t['footer-license-desc']);
    updateHtml('footer-copyright', t['footer-copyright']);
    updateHtml('footer-made-with', t['footer-made-with']);
    
    // 更新语言切换按钮状态
    langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    // 更新滑块位置
    langSwitcher.dataset.active = lang;
    
    // 更新 html lang 属性
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    
    // 切换 lang-text-zh 和 lang-text-en 显示
    document.querySelectorAll('.lang-text-zh').forEach(el => {
      el.style.display = lang === 'zh' ? '' : 'none';
    });
    document.querySelectorAll('.lang-text-en').forEach(el => {
      el.style.display = lang === 'en' ? '' : 'none';
    });
  }
  
  // 更新文本内容（通过 data-i18n 属性）
  function updateText(i18nKey, text) {
    const element = document.querySelector(`[data-i18n="${i18nKey}"]`);
    if (element) {
      element.textContent = text;
    }
  }
  
  // 更新 HTML 内容（支持 HTML 标签）
  function updateHtml(i18nKey, html) {
    const element = document.querySelector(`[data-i18n="${i18nKey}"]`);
    if (element) {
      element.innerHTML = html;
    }
  }
  
  // 绑定语言切换按钮事件
  langBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止冒泡到 langSwitcher
      const lang = btn.dataset.lang;
      if (lang !== currentLang) {
        applyLanguage(lang);
      }
    });
  });
  
  // 点击整个区域也可以切换（点击空白处自动切换到另一个语言）
  langSwitcher.addEventListener('click', (e) => {
    if (e.target === langSwitcher || e.target.classList.contains('lang-slider-bg')) {
      const currentLangValue = langSwitcher.dataset.active || 'zh';
      const newLang = currentLangValue === 'zh' ? 'en' : 'zh';
      if (newLang !== currentLang) {
        applyLanguage(newLang);
      }
    }
  });
  
  // 初始化滑块位置
  langSwitcher.dataset.active = currentLang;
  
  // 初始应用语言
  applyLanguage(currentLang);
}

