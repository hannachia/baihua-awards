import { createContext, useContext, useEffect, useState } from 'react';
import en from './en.js';
import zh from './zh.js';

const dicts = { en, zh };
const Ctx = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem('baihua_lang');
    if (saved && dicts[saved]) return saved;
  } catch { /* ignore */ }
  return 'zh'; // Chinese is the default language
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    try { localStorage.setItem('baihua_lang', lang); } catch { /* ignore */ }
  }, [lang]);

  const t = (key, vars = {}) => {
    let s = dicts[lang][key] ?? en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };
  // Translate known server error messages (falls back to the English text)
  const tr = (msg) => dicts[lang].errors?.[msg] ?? msg;

  return <Ctx.Provider value={{ lang, setLang, t, tr }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
