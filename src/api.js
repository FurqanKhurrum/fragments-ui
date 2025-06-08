// src/api.js

// fragments microservice API to use, defaults to localhost:8080 if not set in env
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Given an authenticated user, request all fragments for this user from the
 * fragments microservice (currently only running locally). We expect a user
 * to have an `idToken` attached, so we can send that along with the request.
 */
export async function getUserFragments(user) {
  console.log('Requesting user fragments data...');
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      // Generate headers with the proper Authorization bearer token to pass.
      // We are using the `authorizationHeaders()` helper method we defined
      // earlier, to automatically attach the user's ID token.
      headers: user.authorizationHeaders(),
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    console.log('Successfully got user fragments data', { data });
    return data;
  } catch (err) {
    console.error('Unable to call GET /v1/fragment', { err });
  }
}

// Create a new text fragment for the authenticated user
export async function createFragment(user, text) {
  console.log('Creating new fragment...');
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: user.authorizationHeaders('text/plain'),
      body: text,
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const location = res.headers.get('Location');
    console.log('Successfully created fragment', { data, location });
    return { data, location };
  } catch (err) {
    console.error('Unable to call POST /v1/fragments', { err });
  }
}