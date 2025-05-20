// src/app.js
import React, { useEffect, useState } from 'react';
import { signIn, getUser } from './auth';
import { getUserFragments } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [fragments, setFragments] = useState([]);

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
      )}
    </div>
  );
}
