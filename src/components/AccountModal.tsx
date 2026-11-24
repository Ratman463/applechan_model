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
  const surfaceClass = isNight
    ? 'bg-[#172136] text-[#F2F6FC] border-[#2E4166]'
    : 'bg-[#FAF6EE] text-[#222B1E] border-[#DDD3BE]';
  const cardBg = isNight
    ? 'border-[#2A3B5E] bg-[#121B2E]'
    : 'border-[#E2D8C3] bg-[#F4EEE0]';
  const mutedText = isNight ? 'text-[#9CB0D1]' : 'text-[#5E6856]';
  const segmentedBg = isNight ? 'bg-[#0F1728]' : 'bg-[#EDE5D4]';
  const activeTab = isNight
    ? 'bg-[#3C7B52] text-white'
    : 'bg-[#2F6A40] text-[#FCFBF7]';
  const inactiveTab = isNight
    ? 'text-[#B8C7E0] hover:text-white'
    : 'text-[#4C5846] hover:text-[#1D2619]';
  const inputClass = isNight
    ? 'border-[#334870] bg-[#101829] text-[#F2F6FC] placeholder-[#7B92B8] focus:border-[#5CA371]'
    : 'border-[#D5C9B0] bg-white text-[#222B1E] placeholder-[#8E9686] focus:border-[#2F6A40]';
  const subtleBtn = isNight
    ? 'bg-[#233252] text-[#E8F0FF] hover:bg-[#2C3F66]'
    : 'bg-[#ECE4D2] text-[#2B3725] hover:bg-[#E0D5BE]';

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
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${surfaceClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Database className="h-4 w-4 text-[#3C7B52]" />
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
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              isNight ? 'hover:bg-[#253555]' : 'hover:bg-[#EAE1CE]'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!backendAvailable && (
          <div
            className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs ${
              isNight
                ? 'border-[#614D26] bg-[#2B2212] text-[#F5D08A]'
                : 'border-[#E6CFA0] bg-[#FDF5E4] text-[#7D5611]'
            }`}
          >
            {t.accountOfflineNotice}
          </div>
        )}

        {session ? (
          <div className="mt-5 space-y-4">
            <div className={`space-y-2 rounded-xl border p-4 text-xs ${cardBg}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={mutedText}>{t.accountSignedInAs}</span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-[#3C7B52]">
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
              <p className="text-xs font-semibold text-[#3C7B52]">{saveToast}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving || !backendAvailable}
                onClick={() => void onSaveNow()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2F6A40] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#265734] disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? t.accountSavingLabel : t.accountSaveNowBtn}</span>
              </button>

              <button
                type="button"
                disabled={!backendAvailable}
                onClick={() => void onDownloadDb()}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${subtleBtn}`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.accountDownloadDbBtn}</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${subtleBtn}`}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t.accountSignOutBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
            <div className={`grid grid-cols-2 gap-1 rounded-xl p-1 ${segmentedBg}`}>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'login' ? activeTab : inactiveTab
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
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'register' ? activeTab : inactiveTab
                }`}
              >
                {t.accountRegisterTab}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">
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
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${inputClass}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">
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
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${inputClass}`}
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-semibold text-[#D64940]">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !backendAvailable}
              className="w-full rounded-lg bg-[#2F6A40] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#265734] disabled:opacity-50 cursor-pointer"
            >
              {mode === 'register' ? t.accountRegisterSubmit : t.accountLoginSubmit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
