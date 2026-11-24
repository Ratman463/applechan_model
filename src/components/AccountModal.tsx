import { Database, Download, LogOut, Save, UserCheck, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { TRANSLATIONS } from '../i18n';
import { Language, PlayerSession } from '../scene/types';

interface AccountModalProps {
  open: boolean;
  language: Language;
  isNight: boolean;
  backendAvailable: boolean;
  session: PlayerSession | null;
  saving: boolean;
  saveToast: string | null;
  onClose: () => void;
  onRegister: (username: string, password: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  onSaveNow: () => Promise<void>;
  onDownloadDb: () => Promise<void>;
  onSignOut: () => void;
}

export function AccountModal({
  open,
  language,
  isNight,
  backendAvailable,
  session,
  saving,
  saveToast,
  onClose,
  onRegister,
  onLogin,
  onSaveNow,
  onDownloadDb,
  onSignOut,
}: AccountModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const t = TRANSLATIONS[language];
  const panelClass = isNight ? 'mc-panel-dark' : 'mc-panel';
  const insetClass = isNight ? 'mc-inset-dark' : 'mc-inset';
  const btnClass = isNight ? 'mc-btn-dark' : 'mc-btn';
  const mutedText = isNight ? 'text-[#b5bcc7]' : 'text-[#424242]';
  const inputClass = isNight
    ? 'mc-slot-dark text-[#f4f4f4] placeholder-[#8f98a8] focus:outline-2 focus:outline-white'
    : 'border-2 border-[#373737] bg-[#e6e6e6] text-[#1c1c1c] placeholder-[#6b6b6b] shadow-[inset_2px_2px_0_#7d7d7d] focus:outline-2 focus:outline-[#4f8a36]';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await onRegister(username.trim(), password);
      } else {
        await onLogin(username.trim(), password);
      }
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedUpdatedAt = session?.updatedAt
    ? new Date(session.updatedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')
    : '—';

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md p-5 ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Database className="h-4 w-4 text-[#4f8a36]" />
              <span>{t.accountTitle}</span>
            </h2>
            <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>
              {t.accountSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className={`flex h-8 w-8 items-center justify-center cursor-pointer ${btnClass}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!backendAvailable && (
          <div className={`mt-4 px-3 py-2 text-xs font-medium ${insetClass}`}>
            {t.accountOfflineNotice}
          </div>
        )}

        {session ? (
          <div className="mt-4 space-y-4">
            <div className={`space-y-2 p-3.5 text-xs ${insetClass}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={mutedText}>{t.accountSignedInAs}</span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-[#4f8a36]">
                  <UserCheck className="h-4 w-4" />
                  {session.username}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={mutedText}>{t.accountDbFileLabel}</span>
                <span
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {session.dbFile}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={mutedText}>{t.accountLastSaved}</span>
                <span className="tabular-nums">{formattedUpdatedAt}</span>
              </div>
            </div>

            {saveToast && (
              <p className="text-xs font-bold text-[#4f8a36]">{saveToast}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving || !backendAvailable}
                onClick={() => void onSaveNow()}
                className="mc-btn-green flex flex-1 items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? t.accountSavingLabel : t.accountSaveNowBtn}</span>
              </button>

              <button
                type="button"
                disabled={!backendAvailable}
                onClick={() => void onDownloadDb()}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer ${btnClass}`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.accountDownloadDbBtn}</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold cursor-pointer ${btnClass}`}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t.accountSignOutBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold cursor-pointer ${
                  mode === 'login' ? 'mc-btn-green' : btnClass
                }`}
              >
                {t.accountLoginTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold cursor-pointer ${
                  mode === 'register' ? 'mc-btn-green' : btnClass
                }`}
              >
                {t.accountRegisterTab}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {t.accountUsernameLabel}
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={24}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.accountUsernamePlaceholder}
                  className={`w-full px-3 py-2 text-sm outline-none ${inputClass}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {t.accountPasswordLabel}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.accountPasswordPlaceholder}
                  className={`w-full px-3 py-2 text-sm outline-none ${inputClass}`}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-bold text-[#c9352b]">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !backendAvailable}
              className="mc-btn-green w-full px-4 py-2.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              {mode === 'register' ? t.accountRegisterSubmit : t.accountLoginSubmit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
