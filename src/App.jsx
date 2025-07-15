// src/app.js
import React, { useEffect, useState } from 'react';
import { signIn, getUser } from './auth';
//import { getUserFragments } from './api';
import { getUserFragments, createFragment } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [fragments, setFragments] = useState([]);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState('text/plain');

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (user) {
        setUser(user);

        const data = await getUserFragments(user);
        setFragments(data.fragments || []);
      }
    }

    init();
  }, []);

  async function handleCreateFragment(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    await createFragment(user, newText, newType);
    const data = await getUserFragments(user);
    setFragments(data.fragments || []);
    setNewText('');
    setNewType('text/plain');
  }

  return (
    <div>
      <h1>Fragments UI</h1>

      <section>
        <nav>
          {!user && (
            <button onClick={signIn}>
              Login
            </button>
          )}
        </nav>
      </section>

      {user && (
        <>
          <section>
            <h2>Hello, {user.username}!</h2>
            <h3>Your Fragments:</h3>
            <ul>
              {fragments.length === 0 && <li>No fragments yet.</li>}
              {fragments.map((frag, i) => (
                typeof frag === 'string' ? (
                  <li key={i}>{frag}</li>
                ) : (
                  <li key={i}>
                    {frag.id} - Created on{' '}
                    {new Date(frag.created).toLocaleString()}
                  </li>
                )
              ))}
            </ul>
          </section>
          <section>
            <h3>Create Fragment</h3>
            <form onSubmit={handleCreateFragment}>
              <label>
                Type:
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option value="text/plain">text/plain</option>
                  <option value="text/markdown">text/markdown</option>
                  <option value="application/json">application/json</option>
                </select>
              </label>
              <textarea
                rows="4"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <button type="submit">Create Fragment</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}