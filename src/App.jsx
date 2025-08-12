import React, { useEffect, useMemo, useState } from 'react';
import { signIn, getUser } from './auth';
import {
  getUserFragments as listFragments,
  createFragment as postFragment,
  viewFragment,
  deleteFragment,
  updateFragment,
} from './api';

export default function App() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const [user, setUser] = useState(null);

  // list
  const [fragments, setFragments] = useState([]);

  // create
  const [newType, setNewType] = useState('text/plain');
  const [newText, setNewText] = useState('');          // for text/*
  const [newJSON, setNewJSON] = useState('');          // for application/*
  const [newImage, setNewImage] = useState(null);      // for image/*

  // view / update
  const [selectedId, setSelectedId] = useState('');
  const [viewError, setViewError] = useState('');
  const [viewData, setViewData] = useState(null);      // string | object | dataURL
  const [viewType, setViewType] = useState('');        // mime
  const [updateImage, setUpdateImage] = useState(null);
  const [updateError, setUpdateError] = useState('');

  const isAuthed = !!user?.idToken;

  // ---------- init / auth ----------
  useEffect(() => {
    (async () => {
      const u = await getUser();
      if (u?.idToken) {
        setUser(u);
        await refreshList(u);
      }
    })();
  }, []);

  async function refreshList(u = user) {
    try {
      const data = await listFragments(u);
      setFragments(data?.fragments || []);
    } catch (e) {
      console.error('Failed to list fragments', e);
    }
  }

  // ---------- create (POST) ----------
  async function handleCreate(e) {
    e.preventDefault();
    if (!isAuthed) return;

    try {
      let body;
      let contentType;

      if (newType.startsWith('text/')) {
        if (!newText.trim()) return;
        body = newText;
        contentType = newType; // "text/plain" or "text/markdown"
      } else if (newType.startsWith('application/')) {
        // validate JSON first
        JSON.parse(newJSON || '');
        body = newJSON;
        contentType = 'application/json';
      } else if (newType.startsWith('image/')) {
        if (!newImage) return;

        // Only allow known-safe image types that your backend likely accepts
        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (!allowed.includes(newImage.type)) {
          alert(`Unsupported image type: ${newImage.type}. Try PNG, JPEG, WEBP, or GIF.`);
          return;
        }

        body = newImage;
        contentType = newImage.type; // e.g., "image/png"
      } else {
        alert(`Unsupported type: ${newType}`);
        return;
      }

      // Fixed: correct parameter order - (user, content, fragmentType)
      await postFragment(user, body, contentType);

      await refreshList();
      // reset create form
      setNewText('');
      setNewJSON('');
      setNewImage(null);
      setNewType('text/plain');
    } catch (err) {
      console.error('⚠️ Failed to create fragment:', err);
      const msg =
        err?.body?.error?.message ||
        err?.statusText ||
        'Failed to create fragment. See console for details.';
      alert(msg);
    }
  }

  // ---------- view (GET :id) ----------
  async function handleView(id) {
    if (!isAuthed || !id) return;
    setViewError('');
    setUpdateError('');
    setSelectedId(id);
    setViewData(null);
    setViewType('');

    try {
      const { data, fragmentType } = await viewFragment(user, id);
      setViewType(fragmentType);

      if (fragmentType.startsWith('image/')) {
        // assume data is a dataURL or blob URL already (matches your app.js usage)
        setViewData(data);
      } else if (fragmentType.startsWith('text/')) {
        setViewData(typeof data === 'string' ? data : String(data));
      } else {
        // application/* — pretty print JSON if possible
        try {
          const obj = typeof data === 'string' ? JSON.parse(data) : data;
          setViewData(JSON.stringify(obj, null, 2));
        } catch {
          setViewData(typeof data === 'string' ? data : JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error(err);
      setViewError('Failed to fetch fragment. Check the ID and try again.');
    }
  }

  // ---------- delete ----------
  async function handleDelete(id) {
    if (!isAuthed || !id) return;
    try {
      await deleteFragment(user, id);
      if (selectedId === id) {
        setSelectedId('');
        setViewData(null);
        setViewType('');
      }
      await refreshList();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete fragment.');
    }
  }

  // ---------- update (PUT :id) ----------
  // ---------- update (PUT :id) ----------
  async function handleUpdate() {
    if (!isAuthed || !selectedId) return;
    setUpdateError('');

    try {
      // First, verify the fragment still exists by checking our fragments list
      const fragmentExists = fragments.find(f => f.id === selectedId);
      if (!fragmentExists) {
        setUpdateError('Fragment not found. It may have been deleted. Please refresh the list.');
        await refreshList(); // Refresh the list to get current fragments
        return;
      }

      console.log('Updating fragment:', {
        id: selectedId,
        type: viewType,
        existsInList: !!fragmentExists
      });

      let result;
      if (viewType.startsWith('image/')) {
        if (!updateImage) {
          setUpdateError('Please choose an image to upload.');
          return;
        }
        result = await updateFragment(user, selectedId, updateImage, updateImage.type);
        setUpdateImage(null);
      } else if (viewType.startsWith('text/')) {
        result = await updateFragment(user, selectedId, viewData ?? '', viewType);
      } else {
        // application/* (JSON)
        // validate before sending
        try {
          JSON.parse(viewData || '');
        } catch {
          setUpdateError('Invalid JSON.');
          return;
        }
        result = await updateFragment(user, selectedId, viewData ?? '', viewType);
      }

      // Handle replacement strategy (delete + create)
      if (result?._replacementStrategy) {
        console.log('Fragment was replaced using delete+create strategy');
        const newId = result._newId;
        
        if (newId) {
          // Update the selected ID to the new fragment
          setSelectedId(newId);
          // Show the new fragment
          await handleView(newId);
          // Show success message with explanation
          setUpdateError(''); // Clear any previous errors
          alert(`Update successful! Note: Your API doesn't support direct updates, so the fragment was replaced. New ID: ${newId}`);
        } else {
          setUpdateError('Fragment was replaced but new ID not found. Please refresh the list.');
        }
      } else {
        // Normal update succeeded
        // refresh view to ensure we show latest
        await handleView(selectedId);
      }
      
      // refresh list (size/updated may change, or new fragment if replaced)
      await refreshList();
      
    } catch (err) {
      console.error('Update failed', err);
      if (err.status === 404) {
        setUpdateError('Fragment not found. It may have been deleted.');
        // Clear the view since the fragment doesn't exist
        setSelectedId('');
        setViewData(null);
        setViewType('');
        await refreshList();
      } else if (err.status === 501 || err.message.includes('does not support updates')) {
        setUpdateError('Update failed: Your API server does not support fragment updates. Please contact your administrator.');
      } else {
        setUpdateError(err?.body?.error?.message || err?.statusText || 'Failed to update fragment.');
      }
    }
  }

  // ---------- helpers ----------
  const maskedOwner = useMemo(
    () => (s) => (s?.length >= 10 ? `${s.slice(0, 5)}***${s.slice(-5)}` : s || ''),
    []
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1>Fragments UI</h1>

      {!user && (
        <section>
          <button onClick={signIn}>Login</button>
        </section>
      )}

      {user && (
        <>
          <section style={{ marginBottom: 24 }}>
            <h2>Welcome, {user.username}!</h2>
          </section>

          {/* LIST */}
          <section style={{ marginBottom: 32 }}>
            <h3>Your Fragments</h3>
            {fragments.length === 0 ? (
              <p>No fragments yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Owner</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fragments.map((frag) => (
                      <tr key={frag.id}>
                        <td>
                          <button
                            onClick={() => handleView(frag.id)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                            title="View"
                          >
                            {frag.id}
                          </button>
                        </td>
                        <td>{maskedOwner(frag.ownerId)}</td>
                        <td>{frag.type}</td>
                        <td>{frag.size}</td>
                        <td>{new Date(frag.created).toLocaleString()}</td>
                        <td>{new Date(frag.updated).toLocaleString()}</td>
                        <td>
                          <button
                            onClick={() => handleDelete(frag.id)}
                            style={{ background: 'orange', color: 'black' }}
                          >
                            Delete
                          </button>{' '}
                          <a
                            href={`${apiUrl}/v1/fragments/${frag.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            raw
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* CREATE */}
          <section style={{ marginBottom: 32 }}>
            <h3>Create Fragment</h3>

            <form onSubmit={handleCreate}>
              {/* Type selector */}
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="type">Type:&nbsp;</label>
                <select
                  id="type"
                  value={newType}
                  onChange={(e) => {
                    setNewType(e.target.value);
                    // reset inputs when switching
                    setNewText('');
                    setNewJSON('');
                    setNewImage(null);
                  }}
                >
                  {/* text/* */}
                  <option value="text/plain">text/plain</option>
                  <option value="text/markdown">text/markdown</option>
                  {/* application/* */}
                  <option value="application/json">application/json</option>
                  {/* image/* (let file input carry the concrete type) */}
                  <option value="image/*">image/*</option>
                </select>
              </div>

              {/* Conditional inputs */}
              {newType.startsWith('text/') && (
                <textarea
                  rows={4}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  style={{ width: '100%', display: 'block', marginBottom: 12 }}
                  placeholder="Enter text content…"
                  required
                />
              )}

              {newType.startsWith('application/') && (
                <textarea
                  rows={6}
                  value={newJSON}
                  onChange={(e) => setNewJSON(e.target.value)}
                  style={{ width: '100%', display: 'block', marginBottom: 12 }}
                  placeholder='Enter JSON, e.g. {"hello":"world"}'
                  required
                />
              )}

              {newType.startsWith('image/') && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                  required
                />
              )}

              <div style={{ marginTop: 12 }}>
                <button type="submit">Create Fragment</button>
              </div>
            </form>
          </section>

          {/* VIEW / UPDATE */}
          <section>
            <h3>View / Update Fragment</h3>

            {/* Manual ID entry (optional) */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Fragment ID…"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ width: 320, marginRight: 8 }}
              />
              <button onClick={() => handleView(selectedId)}>View</button>
            </div>

            {viewError && (
              <p style={{ color: 'red', marginTop: 8 }}>{viewError}</p>
            )}

            {!!viewType && (
              <div style={{ marginTop: 12 }}>
                <p>
                  <strong>Type:</strong> {viewType}
                </p>

                {/* image */}
                {viewType.startsWith('image/') && typeof viewData === 'string' && (
                  <>
                    <img
                      src={viewData}
                      alt={selectedId}
                      style={{ maxWidth: '100%', display: 'block', marginBottom: 12 }}
                    />
                    <div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => setUpdateImage(e.target.files?.[0] || null)}
                      />
                    </div>
                  </>
                )}

                {/* text */}
                {viewType.startsWith('text/') && (
                  <textarea
                    rows={8}
                    value={viewData ?? ''}
                    onChange={(e) => setViewData(e.target.value)}
                    style={{ width: '100%', display: 'block', marginBottom: 12 }}
                  />
                )}

                {/* application/* (JSON) */}
                {viewType.startsWith('application/') && (
                  <textarea
                    rows={10}
                    value={viewData ?? ''}
                    onChange={(e) => setViewData(e.target.value)}
                    style={{ width: '100%', display: 'block', marginBottom: 12 }}
                  />
                )}

                {updateError && <p style={{ color: 'red' }}>{updateError}</p>}

                <button onClick={handleUpdate}>Update Fragment</button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
