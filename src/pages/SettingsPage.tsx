import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, type ThemeType, type FontSize } from '@/theme/ThemeProvider';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isFontSizeModalOpen, setIsFontSizeModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

  const themeLabels: Record<ThemeType, string> = {
    system: 'System default',
    dark: 'Dark mode',
    light: 'Light mode',
  };

  const fontSizeLabels: Record<FontSize, string> = {
    small: 'Small',
    default: 'Default',
    large: 'Large',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-on-background overflow-hidden font-body-md">
      {/* TopAppBar */}
      <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full h-16 bg-background z-30 shrink-0 border-b border-outline-variant/20">
        <div className="flex items-center gap-sm">
          <h1 className="font-headline-md text-headline-md font-bold text-on-background">Settings</h1>
        </div>
      </header>

      {/* Scrollable Content Canvas */}
      <div className="flex-1 overflow-y-auto pb-[100px] md:pb-xl px-margin-mobile md:px-margin-desktop py-lg">
        <div className="max-w-[800px] mx-auto space-y-xl">
          {/* Appearance Section */}
          <section className="space-y-md">
            <h2 className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">Appearance</h2>
            <div className="bg-surface rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
              <div 
                className="p-md flex items-center justify-between border-b border-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                onClick={() => setIsThemeModalOpen(true)}
              >
                <div>
                  <h3 className="font-body-md text-body-md font-semibold text-on-surface">Theme</h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">{themeLabels[theme]}</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>
              <div 
                className="p-md flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer"
                onClick={() => setIsFontSizeModalOpen(true)}
              >
                <div>
                  <h3 className="font-body-md text-body-md font-semibold text-on-surface">Font Size</h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">{fontSizeLabels[fontSize]}</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>
            </div>
          </section>

          {/* Data Section */}
          <section className="space-y-md">
            <h2 className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">Data</h2>
            <div className="bg-surface rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
              <div 
                className="p-md flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer"
                onClick={() => navigate('/backup')}
              >
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-on-surface">backup</span>
                  <div>
                    <h3 className="font-body-md text-body-md font-semibold text-on-surface">Backup & Import</h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">Manage your local data</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="space-y-md">
            <h2 className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">About</h2>
            <div className="bg-surface rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
              <div className="p-md flex items-center justify-between border-b border-surface-variant">
                <h3 className="font-body-md text-body-md text-on-surface">Version</h3>
                <span className="font-body-md text-body-md text-on-surface-variant">v1.0.0</span>
              </div>
              <div 
                className="p-md flex items-center justify-between border-b border-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                onClick={() => setIsPrivacyModalOpen(true)}
              >
                <h3 className="font-body-md text-body-md text-on-surface">Privacy Policy</h3>
                <span className="material-symbols-outlined text-on-surface-variant">open_in_new</span>
              </div>
              <div 
                className="p-md flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer"
                onClick={() => setIsCreditsModalOpen(true)}
              >
                <h3 className="font-body-md text-body-md text-on-surface">Credits & Licenses</h3>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Theme Selection Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-surface p-6 rounded-2xl max-w-sm w-full border border-outline-variant/30 shadow-2xl">
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-4">Choose Theme</h3>
            <div className="space-y-2">
              {(['system', 'dark', 'light'] as ThemeType[]).map((t) => (
                <button
                  key={t}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                    theme === t ? 'bg-primary-container/20 text-primary font-medium border border-primary/30' : 'hover:bg-surface-container text-on-surface'
                  }`}
                  onClick={() => {
                    setTheme(t);
                    setIsThemeModalOpen(false);
                  }}
                >
                  <span>{themeLabels[t]}</span>
                  {theme === t && <span className="material-symbols-outlined text-primary">check</span>}
                </button>
              ))}
            </div>
            <button
              className="mt-6 w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-medium"
              onClick={() => setIsThemeModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Font Size Selection Modal */}
      {isFontSizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-surface p-6 rounded-2xl max-w-sm w-full border border-outline-variant/30 shadow-2xl">
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-4">Font Size</h3>
            <div className="space-y-2">
              {(['small', 'default', 'large'] as FontSize[]).map((s) => (
                <button
                  key={s}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                    fontSize === s ? 'bg-primary-container/20 text-primary font-medium border border-primary/30' : 'hover:bg-surface-container text-on-surface'
                  }`}
                  onClick={() => {
                    setFontSize(s);
                    setIsFontSizeModalOpen(false);
                  }}
                >
                  <span>{fontSizeLabels[s]}</span>
                  {fontSize === s && <span className="material-symbols-outlined text-primary">check</span>}
                </button>
              ))}
            </div>
            <button
              className="mt-6 w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-medium"
              onClick={() => setIsFontSizeModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-surface p-6 rounded-2xl max-w-md w-full border border-outline-variant/30 shadow-2xl">
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-2">Privacy Policy</h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed mb-4">
              LocalNote is 100% offline-first. All your notes, checklists, events, folders, and attachments stay strictly on your device inside a local SQLite database. No tracking, analytics, or external server calls are made.
            </p>
            <button
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity"
              onClick={() => setIsPrivacyModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Credits Modal */}
      {isCreditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-surface p-6 rounded-2xl max-w-md w-full border border-outline-variant/30 shadow-2xl">
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-2">Credits & Licenses</h3>
            <div className="text-body-md text-on-surface-variant space-y-2 mb-4">
              <p>Built with React 19, TypeScript, Vite, Tailwind CSS, and SQLite.</p>
              <p>Editor engine: Tiptap & ProseMirror.</p>
              <p>Icons: Material Symbols Outlined by Google.</p>
              <p>Typography: Inter by Rasmus Andersson and JetBrains Mono.</p>
            </div>
            <button
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity"
              onClick={() => setIsCreditsModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

