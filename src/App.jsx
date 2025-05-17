import React, { useEffect, useState } from 'react';
import { signIn, getUser } from './auth';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Wait for the app to mount and then check if the user is authenticated
    getUser().then(setUser);
  }, []);

  return (
    <div>
      <h1>Fragments UI</h1>
      <section>
        <nav>
          <button id="login" onClick={signIn} disabled={!!user}>
            Login
          </button>
        </nav>
      </section>

      {user && (
        <section id="user">
          <h2>Hello <span className="username">{user.username}</span>!</h2>
        </section>
      )}
    </div>
  );
}
