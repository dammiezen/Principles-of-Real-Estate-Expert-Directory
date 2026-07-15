(function () {
  "use strict";

  const config = window.PRINCIPLES_RESOURCE_CONFIG || {};
  const storageKey = config.accessStorageKey || "principles_resource_access_v1";

  function getSession() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const session = JSON.parse(raw);
      if (!session || !session.name || !session.expiresAt) return null;

      if (Date.now() >= Number(session.expiresAt)) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return session;
    } catch (error) {
      localStorage.removeItem(storageKey);
      return null;
    }
  }

  function isAuthorized() {
    return Boolean(getSession());
  }

  function revealProtectedPage() {
    document.body.classList.remove("auth-pending");
    document.body.classList.add("auth-authorized");

    const session = getSession();
    document.querySelectorAll("[data-authorized-name]").forEach((element) => {
      element.textContent = session ? session.name : "Authorized Student";
    });
  }

  function requestedPage() {
    const currentFile = location.pathname.split("/").pop() || "index.html";
    return currentFile === "index.html" ? "" : currentFile;
  }

  function requireAccess() {
    if (!isAuthorized()) {
      const next = requestedPage();
      const destination = next
        ? `./index.html?next=${encodeURIComponent(next)}`
        : "./index.html";

      location.replace(destination);
      return false;
    }

    revealProtectedPage();
    return true;
  }

  function saveSession(name) {
    const days = Number(config.accessDurationDays) || 30;
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        name: String(name || "").trim(),
        expiresAt
      })
    );
  }

  function clearSession() {
    localStorage.removeItem(storageKey);
  }

  function lockApp() {
    const shouldLock = window.confirm(
      "Lock this app now? The student name and access code will be required again."
    );

    if (!shouldLock) return;

    clearSession();
    location.replace("./index.html?locked=1");
  }

  async function hashText(value) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("Secure password checking is not supported by this browser.");
    }

    const encoded = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", encoded);

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function verifyAccessCode(value) {
    const submittedHash = await hashText(String(value || ""));
    return submittedHash === config.accessCodeHash;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // The app still works online if service-worker registration fails.
      });
    });
  }

  window.POREAuth = Object.freeze({
    getSession,
    isAuthorized,
    requireAccess,
    saveSession,
    clearSession,
    lockApp,
    verifyAccessCode,
    revealProtectedPage
  });

  registerServiceWorker();
})();
