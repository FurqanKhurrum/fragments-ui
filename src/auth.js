// src/auth.js

import { UserManager } from 'oidc-client-ts';

const cognitoAuthConfig = {
  authority: `https://cognito-idp.us-east-1.amazonaws.com/${import.meta.env.VITE_AWS_COGNITO_POOL_ID}`,
  client_id: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_OAUTH_SIGN_IN_REDIRECT_URL,
  response_type: "code",
  scope: "openid email",
  revokeTokenTypes: ['refresh_token'],
  automaticSilentRenew: false,
};

// Create a UserManager instance
const userManager = new UserManager({
  ...cognitoAuthConfig,
});

export async function signIn() {
  // Trigger a redirect to the Cognito auth page, so user can authenticate
  await userManager.signinRedirect();
}

// Create a simplified view of the user, with an extra method for creating the auth headers
function formatUser(user) {
  return {
    // If you add any other profile scopes, you can include them here
    username: user.profile['cognito:username'],
    email: user.profile.email,
    idToken: user.id_token,
    accessToken: user.access_token, 
    authorizationHeaders: (type = 'application/json') => ({
      'Content-Type': type,
      Authorization: `Bearer ${user.id_token}`,
    }),
  };
}

export async function getUser() {
  // First, check if we're handling a signin redirect callback (e.g., is ?code=... in URL)
  if (window.location.search.includes('code=')) {
    const user = await userManager.signinCallback();
    // Remove the auth code from the URL without triggering a reload
    window.history.replaceState({}, document.title, window.location.pathname);
    return formatUser(user);
  }

  // Otherwise, get the current user
  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}