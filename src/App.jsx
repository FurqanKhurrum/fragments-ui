// src/app.js
import React, { useEffect, useState } from 'react';
import { signIn, getUser } from './auth';
//import { getUserFragments } from './api';
import { getUserFragments, createFragment } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [fragments, setFragments] = useState([]);
  const [newText, setNewText] = useState('');

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (user) {
        setUser(user);

        // ✅ fetch fragments only when logged in
        const data = await getUserFragments(user);
        setFragments(data.fragments || []);
      }
    }

    init();
  }, []);

  async function handleCreateFragment(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    await createFragment(user, newText);
    const data = await getUserFragments(user);
    setFragments(data.fragments || []);
    setNewText('');
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
                <li key={i}>{frag}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Create Text Fragment</h3>
            <form onSubmit={handleCreateFragment}>
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