import { createContext, useContext, useState } from 'react';
import SignInModal from './components/SignInModal.jsx';
import { setViewerToken } from './api.js';

const Ctx = createContext(null);
const EMAIL_KEY = 'baihua_viewer_email';
const NAME_KEY = 'baihua_viewer_name';
const TOKEN_KEY = 'baihua_viewer_token';

function stored() {
  try {
    const email = localStorage.getItem(EMAIL_KEY);
    return email && localStorage.getItem(TOKEN_KEY) ? { email, name: localStorage.getItem(NAME_KEY) || '' } : null;
  } catch { return null; }
}

export function ViewerProvider({ children }) {
  const [viewer, setViewer] = useState(stored);
  const [modal, setModal] = useState(null); // null, 'email' (sign in) or 'name' (choose a display name)

  const saveName = (name) => {
    try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
    setViewer((v) => (v ? { ...v, name } : v));
  };
  // After a successful sign-in. People without a display name are asked for one next.
  const signedIn = (email, token, name) => {
    setViewerToken(token);
    try { localStorage.setItem(EMAIL_KEY, email); localStorage.setItem(NAME_KEY, name || ''); } catch { /* ignore */ }
    setViewer({ email, name: name || '' });
    setModal(name ? null : 'name');
  };
  const signOut = () => {
    setViewerToken(null);
    try { localStorage.removeItem(EMAIL_KEY); localStorage.removeItem(NAME_KEY); } catch { /* ignore */ }
    setViewer(null);
  };

  return (
    <Ctx.Provider value={{ viewer, openSignIn: () => setModal('email'), openSetName: () => setModal('name'), signOut }}>
      {children}
      {modal && <SignInModal start={modal} email={viewer?.email} onSignedIn={signedIn} onName={(n) => { saveName(n); setModal(null); }} onClose={() => setModal(null)} />}
    </Ctx.Provider>
  );
}

export const useViewer = () => useContext(Ctx);
