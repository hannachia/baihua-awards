// In production set VITE_API_URL (for example https://api.example.com/api) when the website and API are on different addresses.
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ADMIN = 'baihua_admin_token';
const VIEWER = 'baihua_viewer_token';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* ignore */ } };

export const getToken = () => read(ADMIN);
export const setToken = (t) => write(ADMIN, t);
export const getViewerToken = () => read(VIEWER);
export const setViewerToken = (t) => write(VIEWER, t);

// auth: true or 'admin' = organizer token, 'viewer' = audience token
export async function api(path, { method = 'GET', body, form, auth } = {}) {
  if (import.meta.env.MODE === 'single') {
    const { demoApi } = await import('./demo.js'); // preview only: sample data, no server
    return demoApi(path, { method, body });
  }
  const headers = {};
  if (auth === true || auth === 'admin') headers.Authorization = `Bearer ${getToken()}`;
  if (auth === 'viewer') headers.Authorization = `Bearer ${getViewerToken()}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error('Request failed');
    err.status = res.status;
    err.errors = data.errors || ['Request failed.'];
    throw err;
  }
  return res;
}

export async function downloadBlob(path, filename) {
  const res = await api(path, { auth: true });
  if ((res.headers.get('content-type') || '').includes('application/json')) {
    window.open((await res.json()).url, '_blank'); // cloud storage: open the short-lived signed link
    return;
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Upload a form with a progress callback (fetch cannot report upload progress). Resolves with the parsed JSON.
export function upload(path, form, onProgress) {
  if (import.meta.env.MODE === 'single') {
    return api(path, { method: 'POST', form }).then((r) => { onProgress?.(100); return r.json(); });
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${path}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      const err = new Error('Request failed');
      err.status = xhr.status;
      err.errors = data.errors || ['Request failed.'];
      reject(err);
    };
    xhr.onerror = () => { const err = new Error('Network error'); err.errors = ['Could not reach the server.']; reject(err); };
    xhr.send(form);
  });
}
