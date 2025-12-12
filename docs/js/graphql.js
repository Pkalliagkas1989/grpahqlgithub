// docs/js/graphql.js

const GRAPHQL_CONFIG = {
  DOMAIN: "platform.zone01.gr",
  ENDPOINT: "/graphql",
  USE_PROXY: true,
};

async function executeQuery(query, variables = {}) {
  let jwt = localStorage.getItem("jwt");
  if (jwt) jwt = jwt.trim();

  if (!jwt) {
    window.location.href = "index.html";
    return null;
  }

  const response = await fetch(GRAPHQL_CONFIG.ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 401) {
    localStorage.removeItem("jwt");
    window.location.href = "index.html";
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GraphQL request failed with status ${response.status}: ${errorText}`,
    );
  }

  const json = await response.json();

  if (json.errors) {
    const msg = json.errors.map((e) => e.message).join("; ");
    throw new Error(`GraphQL Errors: ${msg}`);
  }

  return json.data;
}

/* =======================
 *  GraphQL QUERIES
 * ======================= */

const GET_USER_INFO = `
  query {
    user {
      id
      login
      firstName
      lastName
      campus
      createdAt
      auditRatio
      totalUp
      totalDown
    }
  }
`;

const GET_USER_XP = `
  query {
    transaction(
      where: {
        type: { _eq: "xp" }
        _or: [
          { object: { type: { _eq: "project" } } }
          { object: { type: { _eq: "module" } } }
          { object: { type: { _eq: "piscine" } } }
        ]
      }
      order_by: { createdAt: asc }
    ) {
      id
      amount
      createdAt
      object {
        id
        name
        type
      }
    }
  }
`;

const GET_USER_RESULTS = `
  query {
    result(order_by: { createdAt: desc }) {
      id
      grade
      type
      path
      createdAt
      object {
        name
        type
      }
    }
  }
`;

window.GraphQL = {
  executeQuery,
  queries: {
    GET_USER_INFO,
    GET_USER_XP,
    GET_USER_RESULTS,
  },
};