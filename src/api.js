// src/api.js

// Prefer Vite-style env var, fall back to Node, then localhost
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
/**
 * Resolve an Authorization header from either:
 * - user.authorizationHeaders().Authorization  (original app helper)
 * - user.idToken.jwtToken or user.idToken      (raw Cognito token)
 */
function getAuthorization(user) {
  try {
    if (typeof user?.authorizationHeaders === 'function') {
      const h = user.authorizationHeaders();
      if (h?.Authorization) return h.Authorization;
    }
  } catch (_) {}
  const token = user?.idToken?.jwtToken || user?.idToken;
  return token ? `Bearer ${token}` : null;
}

/** Build fetch Headers with Authorization and optional Content-Type */
function buildAuthHeaders(user, contentType) {
  const auth = getAuthorization(user);
  if (!auth) {
    console.error('🚫 No bearer token found on user object');
    return null;
  }
  const headers = new Headers();
  headers.set('Authorization', auth);
  if (contentType) headers.set('Content-Type', contentType);
  return headers;
}

/** Parse non-OK responses into useful errors */
async function parseError(res) {
  let body;
  const ct = res.headers.get('Content-Type') || '';
  try {
    body = ct.includes('application/json') ? await res.json() : await res.text();
  } catch {
    body = '<no body>';
  }
  return {
    status: res.status,
    statusText: res.statusText,
    body,
  };
}

/** Helper to fetch + throw structured error on failure */
async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw await parseError(res);
  }
  return res;
}

/**
 * GET /v1/fragments?expand=1
 * (keeps the expand behavior from your original file)
 */
export async function listFragments(user, { expand = true } = {}) {
  console.log('GET /v1/fragments?expand=1');
  const headers = buildAuthHeaders(user);
  if (!headers) return { fragments: [] };

  try {
    const url = `${apiUrl}/v1/fragments${expand ? '?expand=1' : ''}`;
    const res = await safeFetch(url, { method: 'GET', headers });
    const data = await res.json();

    if (data.fragments?.length) {
      console.log(`User has ${data.fragments.length} fragment(s):`, { data });
    } else {
      console.log('User has no saved fragments');
    }
    return data;
  } catch (err) {
    console.error('❌ GET /v1/fragments failed:', err);
    return { fragments: [] };
  }
}

/**
 * POST /v1/fragments
 */
export async function createFragment(user, content, fragmentType = 'text/plain') {
  console.log('POST /v1/fragments');
  const headers = buildAuthHeaders(user, fragmentType);
  if (!headers) return;

  try {
    const res = await safeFetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers,
      body: content,
    });
    const data = await res.json();
    const location = res.headers.get('Location');
    console.log('✅ Fragment created:', { data, location });
    return { data, location };
  } catch (err) {
    console.error('❌ POST /v1/fragments failed:', err);
  }
}

/**
 * GET /v1/fragments/:id
 * (preserves smart parsing for text / json / image from your first file)
 */
export async function viewFragment(user, fragmentId) {
  console.log('GET /v1/fragments/:id');
  const headers = buildAuthHeaders(user);
  if (!headers) return;

  try {
    const res = await safeFetch(`${apiUrl}/v1/fragments/${fragmentId}`, {
      method: 'GET',
      headers,
    });

    const fragmentType = res.headers.get('Content-Type') || '';
    let data;

    if (fragmentType.startsWith('text/')) {
      data = await res.text();
    } else if (fragmentType.startsWith('application/')) {
      data = await res.json();
    } else if (fragmentType.startsWith('image/')) {
      const blob = await res.blob();
      data = URL.createObjectURL(blob);
    } else {
      // Default to ArrayBuffer for unknown types
      data = await res.arrayBuffer();
    }

    console.log('✅ Retrieved fragment data:', { fragmentType, dataSample: String(data).slice(0, 80) });
    return { data, fragmentType };
  } catch (err) {
    console.error('❌ GET /v1/fragments/:id failed:', err);
    throw err;
  }
}

/**
 * PUT /v1/fragments/:id
 */
export async function updateFragment(user, fragmentId, content, fragmentType = 'text/plain') {
  console.log('PUT /v1/fragments/:id');
  const headers = buildAuthHeaders(user, fragmentType);
  if (!headers) return;

  try {
    const res = await safeFetch(`${apiUrl}/v1/fragments/${fragmentId}`, {
      method: 'PUT',
      headers,
      body: content,
    });
    const data = await res.json();
    console.log('✅ Fragment updated:', { data });
    return data;
  } catch (err) {
    console.error('❌ PUT /v1/fragments/:id failed:', err);
    throw err;
  }
}

/**
 * DELETE /v1/fragments/:id
 */
export async function deleteFragment(user, fragmentId) {
  console.log('DELETE /v1/fragments/:id');
  const headers = buildAuthHeaders(user);
  if (!headers) return;

  try {
    const res = await safeFetch(`${apiUrl}/v1/fragments/${fragmentId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    console.log('✅ Fragment deleted:', { data });
    return data;
  } catch (err) {
    console.error('❌ DELETE /v1/fragments/:id failed:', err);
    throw err;
  }
}

export const getUserFragments = listFragments;

// (Optional) named aliases for compatibility with your earlier code
export const postFragment = createFragment;