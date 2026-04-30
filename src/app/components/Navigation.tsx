import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe } from 'lucide-react';
import logoHorizontalImport from '@/assets/logo-horizontal.png';
import type { Locale } from '@/i18n/index';
import { localePath, getAlternateUrl } from '@/i18n/index';
import ui from '@/i18n/ui';

const logoHorizontal = typeof logoHorizontalImport === 'object' && logoHorizontalImport !== null && 'src' in logoHorizontalImport
  ? (logoHorizontalImport as { src: string }).src
  : logoHorizontalImport as string;

interface NavigationProps {
  pathname: string;
  locale?: Locale;
}

export default function Navigation({ pathname, locale = 'zh' }: NavigationProps) {
  const dict = ui[locale];
  const NAV_LINKS = [
    { to: localePath('/', locale), label: dict['nav.home'], match: '/' },
    { to: localePath('/deconstruct', locale), label: dict['nav.deconstruct'], match: '/deconstruct' },
    { to: localePath('/documentation', locale), label: dict['nav.documentation'], match: '/documentation' },
    { to: localePath('/guide', locale), label: dict['nav.guide'], match: '/guide' },
    { to: localePath('/about', locale), label: dict['nav.about'], match: '/about' },
  ];

  const alternate = getAlternateUrl(pathname);

  const isHome = pathname === '/' || pathname === '/en';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeMenu]);

  // Dark text mode: scrolled on home, or any non-home page
  const isLight = !isHome || scrolled;

  // Match active link — strip /en prefix for comparison
  const normalizedPath = pathname.replace(/^\/en/, '') || '/';

  const linkClass = (matchPath: string, mobile = false) => {
    const isActive = normalizedPath === matchPath || (matchPath !== '/' && normalizedPath.startsWith(matchPath));
    if (mobile) {
      return `block py-3 px-4 text-lg transition-colors duration-200 ${
        isActive
          ? 'text-brand border-l-2 border-brand font-medium'
          : 'text-neutral-700 hover:text-neutral-900'
      }`;
    }
    if (isLight) {
      return `relative transition-colors duration-200 ${
        isActive ? 'text-brand font-medium' : 'text-neutral-500 hover:text-neutral-900'
      }`;
    }
    return `relative transition-colors duration-200 ${
      isActive ? 'text-brand' : 'text-white/80 hover:text-white'
    }`;
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-b border-neutral-300/50 shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href={localePath('/', locale)} className="flex items-center">
            <img
              src={logoHorizontal}
              alt={dict['site.name']}
              className={`h-8 transition-all duration-500 ${isLight ? '' : 'brightness-0 invert'}`}
            />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8 text-sm">
            {NAV_LINKS.map((link) => (
              <a key={link.to} href={link.to} className={linkClass(link.match)}>
                {link.label}
              </a>
            ))}

            {/* Language switcher */}
            <a
              href={alternate.path}
              className={`flex items-center gap-1.5 transition-colors duration-200 cursor-pointer ${
                isLight ? 'text-neutral-400 hover:text-neutral-900' : 'text-white/60 hover:text-white'
              }`}
              title={dict['nav.switchLang']}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">{locale === 'zh' ? 'EN' : '中文'}</span>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden relative w-8 h-8 flex items-center justify-center cursor-pointer"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? dict['nav.closeMenu'] : dict['nav.openMenu']}
          >
            <span className={`absolute h-0.5 w-5 rounded transition-all duration-300 ${isLight ? 'bg-neutral-900' : 'bg-white'} ${menuOpen ? 'rotate-45' : '-translate-y-1.5'}`} />
            <span className={`absolute h-0.5 w-5 rounded transition-all duration-300 ${isLight ? 'bg-neutral-900' : 'bg-white'} ${menuOpen ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute h-0.5 w-5 rounded transition-all duration-300 ${isLight ? 'bg-neutral-900' : 'bg-white'} ${menuOpen ? '-rotate-45' : 'translate-y-1.5'}`} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-[70] w-72 bg-white shadow-2xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            >
              <div className="flex justify-end p-6 pb-2">
                <button
                  onClick={closeMenu}
                  className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                  aria-label={dict['nav.closeMenu']}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 px-4 py-4">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', damping: 25, stiffness: 200 }}
                  >
                    <a href={link.to} className={linkClass(link.match, true)} onClick={closeMenu}>
                      {link.label}
                    </a>
                  </motion.div>
                ))}

                {/* Mobile language switcher */}
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: NAV_LINKS.length * 0.05, type: 'spring', damping: 25, stiffness: 200 }}
                  className="mt-4 pt-4 border-t border-neutral-200"
                >
                  <a
                    href={alternate.path}
                    className="flex items-center gap-2 py-3 px-4 text-neutral-500 hover:text-neutral-900 transition-colors duration-200"
                    onClick={closeMenu}
                  >
                    <Globe className="w-4 h-4" />
                    <span>{locale === 'zh' ? 'English' : '中文'}</span>
                  </a>
                </motion.div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Backwards-compatible named export for old SPA pages (remove in Task 4.1)
export { Navigation };
