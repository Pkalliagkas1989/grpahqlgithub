// docs/js/api.js

const API_CONFIG = {
  // same-origin: works locally and on Render
  SIGNIN_ENDPOINT: "/signin",
};

function buildBasicToken(identifier, password) {
  const raw = `${identifier}:${password}`;
  return btoa(raw);
}

/**
 * Sign in via proxy, store JWT in localStorage
 * identifier can be username OR email
 */
async function signin(identifier, password) {
  const basic = buildBasicToken(identifier, password);

  const response = await fetch(API_CONFIG.SIGNIN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  if (response.status === 401) {
    throw new Error("Invalid credentials.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Signin failed: ${response.status} ${text}`);
  }

  const raw = await response.text();
  let token = raw.trim();

  // Try to parse JSON formats too
  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed === "string") {
      token = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (parsed.token) {
        token = parsed.token;
      } else if (parsed.jwt) {
        token = parsed.jwt;
      }
    }
  } catch (_) {
    // not JSON, ignore
  }

  // Strip wrapping quotes if still present
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  token = token.trim();

  localStorage.setItem("jwt", token);
  return token;
}

function logout() {
  localStorage.removeItem("jwt");
  window.location.href = "index.html";
}

window.API = {
  signin,
  logout,
};
