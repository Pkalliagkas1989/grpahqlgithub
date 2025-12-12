// docs/js/profile.js

(function () {
  const { executeQuery, queries } = window.GraphQL;
  const { logout } = window.API;
  const { renderXpOverTime, renderPassFailRatio, renderXpByProject } =
    window.Charts;

  const elements = {
    tagline: document.getElementById("user-tagline"),
    login: document.getElementById("profile-login"),
    campus: document.getElementById("profile-campus"),
    createdAt: document.getElementById("profile-created-at"),

    totalXp: document.getElementById("stat-total-xp"),
    auditRatio: document.getElementById("stat-audit-ratio"),
    auditUp: document.getElementById("stat-audit-up"),
    auditDown: document.getElementById("stat-audit-down"),

    passRate: document.getElementById("stat-pass-rate"),
    passCount: document.getElementById("stat-pass-count"),
    failCount: document.getElementById("stat-fail-count"),

    recentProjects: document.getElementById("recent-projects"),

    xpChart: document.getElementById("xp-chart"),
    passFailChart: document.getElementById("passfail-chart"),
    xpProjectsChart: document.getElementById("xp-projects-chart"),

    logoutBtn: document.getElementById("logout-btn"),
    errorBanner: document.getElementById("profile-error"),
  };

  function setError(message) {
    if (!elements.errorBanner) return;

    if (!message) {
      elements.errorBanner.style.display = "none";
      elements.errorBanner.textContent = "";
      return;
    }

    elements.errorBanner.style.display = "block";
    elements.errorBanner.textContent = message;
  }

  function formatDate(isoString) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function computePassFail(results) {
    let pass = 0;
    let fail = 0;

    for (const row of results) {
      const grade = Number(row.grade) || 0;
      if (grade >= 1) pass++;
      else fail++;
    }

    const total = pass + fail;
    const rate = total > 0 ? Math.round((pass / total) * 100) : 0;
    return { pass, fail, rate };
  }

  function sumXp(xpRows) {
    return xpRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  }

  function renderUserInfo(user) {
    const campus = user.campus || "—";
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;

    elements.login.textContent = user.login || "—";
    elements.campus.textContent = campus;
    elements.createdAt.textContent = formatDate(user.createdAt);
    elements.tagline.textContent = `${name} · ${campus}`;
  }

  function renderAuditInfo(auditRatio, totalUp, totalDown) {
    const up = Number(totalUp || 0);
    const down = Number(totalDown || 0);

    const ratio =
      auditRatio != null && !Number.isNaN(Number(auditRatio))
        ? Number(auditRatio)
        : 0;

    elements.auditUp.textContent = formatNumber(up);
    elements.auditDown.textContent = formatNumber(down);
    elements.auditRatio.textContent = ratio.toFixed(2);
  }

  function renderRecentProjects(xpRows) {
    const container = elements.recentProjects;
    container.innerHTML = "";

    if (!xpRows || xpRows.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No XP transactions yet.";
      container.appendChild(li);
      return;
    }

    const byDateDesc = [...xpRows].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    const slice = byDateDesc.slice(0, 6);
    slice.forEach((row) => {
      const li = document.createElement("li");
      li.className = "projects-list__item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "projects-list__name";
      nameSpan.textContent = row.object?.name || "Unknown project";

      const xpSpan = document.createElement("span");
      xpSpan.className = "projects-list__xp";
      xpSpan.textContent = `+${formatNumber(row.amount)} XP`;

      li.appendChild(nameSpan);
      li.appendChild(xpSpan);
      container.appendChild(li);
    });
  }

  async function loadProfile() {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      window.location.href = "index.html";
      return;
    }

    setError(null);
    elements.tagline.textContent = "Loading your data...";

    try {
      const userData = await executeQuery(queries.GET_USER_INFO);
      const user = userData?.user?.[0] || null;

      if (!user) {
        setError("No user data found for this account.");
        elements.tagline.textContent = "No data.";
        return;
      }

      const [xpData, resultsData] = await Promise.all([
        executeQuery(queries.GET_USER_XP),
        executeQuery(queries.GET_USER_RESULTS),
      ]);

      const xpRows = xpData?.transaction || [];
      const results = resultsData?.result || [];

      renderUserInfo(user);

      const totalXp = sumXp(xpRows);
      elements.totalXp.textContent = `${formatNumber(totalXp)} XP`;

      renderAuditInfo(user.auditRatio, user.totalUp, user.totalDown);

      const { pass, fail, rate } = computePassFail(results);
      elements.passRate.textContent = `${rate}%`;
      elements.passCount.textContent = pass.toString();
      elements.failCount.textContent = fail.toString();

      renderRecentProjects(xpRows);

      renderXpOverTime(elements.xpChart, xpRows);
      renderPassFailRatio(elements.passFailChart, results);
      renderXpByProject(elements.xpProjectsChart, xpRows);

      setError(null);
    } catch (err) {
      console.error("Failed to load profile:", err);

      let msg =
        "Something went wrong while loading your profile. Please refresh and try again.";

      if (err && typeof err.message === "string") {
        if (err.message.includes("Could not verify JWT")) {
          msg = "Session expired. Please log in again.";
          logout();
          return;
        }
        if (err.message.startsWith("GraphQL Errors:")) {
          msg = "The API returned an error. Try again in a moment.";
        }
      }

      setError(msg);
      elements.tagline.textContent = "Error loading profile.";
    }
  }

  function setupLogout() {
    if (!elements.logoutBtn) return;
    elements.logoutBtn.addEventListener("click", logout);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupLogout();
    loadProfile();
  });
})();