(function () {
  // Prevent duplicate injection
  if (document.getElementById("pokefriends-extension-root")) {
    return;
  }

  // Create extension container and append to body
  const container = document.createElement("div");
  container.id = "pokefriends-extension-root";
  document.body.appendChild(container);

  // Attach Shadow DOM to prevent style conflicts with Reddit
  const shadow = container.attachShadow({ mode: "open" });

  // Inline CSS Styles
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    :host {
      all: initial;
    }

    .pokefriends-panel {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483647;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      color: #f8fafc;
      box-sizing: border-box;
    }

    .pokefriends-panel * {
      box-sizing: border-box;
    }

    /* Minimized Floating Pokéball Badge Button (Default State) */
    .pokefriends-panel.minimized {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #ffffff 50%, #f1f5f9 100%);
      border: 4px solid #1e293b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
    }

    .pokefriends-panel.minimized:hover {
      transform: scale(1.08) rotate(15deg);
    }

    .pokefriends-panel.minimized .panel-full-content {
      display: none;
    }

    .pokefriends-panel.minimized .panel-min-content {
      display: flex;
      position: relative;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    }

    .minimized-center-ring {
      width: 18px;
      height: 18px;
      background: #ffffff;
      border: 4px solid #1e293b;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
    }

    .minimized-center-line {
      position: absolute;
      width: 100%;
      height: 4px;
      background: #1e293b;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
    }

    .pokefriends-panel:not(.minimized) .panel-min-content {
      display: none;
    }

    /* Full Panel Layout */
    .panel-full-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .pokefriends-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(30, 41, 59, 0.4);
    }

    .header-title-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-logo {
      width: 24px;
      height: 24px;
      background: linear-gradient(to bottom, #ef4444 50%, #ffffff 50%);
      border: 2.5px solid #1e293b;
      border-radius: 50%;
      position: relative;
    }

    .header-logo::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 3px;
      background: #1e293b;
      top: 50%;
      transform: translateY(-50%);
    }

    .header-logo::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 8px;
      background: #ffffff;
      border: 2.5px solid #1e293b;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .header-title {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }

    .header-actions {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .action-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }

    .action-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    /* Loading Screen */
    .loading-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .spinner-pokeball {
      width: 60px;
      height: 60px;
      background: linear-gradient(to bottom, #ef4444 50%, #ffffff 50%);
      border-radius: 50%;
      border: 4px solid #1e293b;
      position: relative;
      animation: spin 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
    }

    .spinner-pokeball::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 4px;
      background: #1e293b;
      top: 50%;
      transform: translateY(-50%);
    }

    .spinner-pokeball::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      background: #ffffff;
      border: 4px solid #1e293b;
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 14px;
      color: #94a3b8;
    }

    /* List Screen (Active View) */
    .list-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: calc(100% - 57px);
    }

    .list-toolbar {
      display: flex;
      padding: 12px 16px;
      gap: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      align-items: center;
    }

    .search-input {
      flex: 1;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      color: #ffffff;
      outline: none;
      font-family: inherit;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }

    .copy-all-btn {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      white-space: nowrap;
    }

    .copy-all-btn:hover {
      background: rgba(59, 130, 246, 0.25);
      color: #ffffff;
      border-color: #3b82f6;
    }

    .stats-bar {
      padding: 6px 16px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    .github-status {
      font-weight: 600;
      cursor: help;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    
    .github-status.success { color: #4ade80; }
    .github-status.warning { color: #fbbf24; }
    .github-status.error { color: #f87171; }

    .codes-scrollview {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Scrollbar Styling */
    .codes-scrollview::-webkit-scrollbar {
      width: 6px;
    }
    .codes-scrollview::-webkit-scrollbar-track {
      background: transparent;
    }
    .codes-scrollview::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
    .codes-scrollview::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Friend Code Card */
    .code-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 14px;
      transition: all 0.2s;
    }

    .code-card:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-1px);
    }

    .code-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .code-value {
      font-family: 'Outfit', monospace;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #f1f5f9;
    }

    .copy-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
      font-family: inherit;
    }

    .copy-btn:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.4);
      color: #60a5fa;
    }

    .copy-btn.copied {
      background: rgba(34, 197, 94, 0.2);
      border-color: rgba(34, 197, 94, 0.4);
      color: #4ade80;
    }

    /* Empty/No Results View */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #64748b;
      gap: 12px;
      height: 100%;
      text-align: center;
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      opacity: 0.35;
      fill: currentColor;
    }

    .empty-state-text {
      font-size: 14px;
      font-weight: 500;
    }

    .pokefriends-hidden {
      display: none !important;
    }
  `;
  shadow.appendChild(style);

  // HTML Structure (Starts as Minimized Pokéball Badge)
  const panel = document.createElement("div");
  panel.id = "mainPanel";
  panel.className = "pokefriends-panel minimized";

  panel.innerHTML = `
    <!-- Minimized Pokéball Badge -->
    <div class="panel-min-content" id="minimizedBadge">
      <div class="minimized-center-line"></div>
      <div class="minimized-center-ring"></div>
    </div>

    <!-- Full Panel UI -->
    <div class="panel-full-content">
      <div class="pokefriends-header">
        <div class="header-title-container">
          <div class="header-logo"></div>
          <span class="header-title">PokeFriends</span>
        </div>
        <div class="header-actions">
          <button class="action-btn" id="syncBtn" title="Sync Megathread JSON">
            <svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 0 1-7 7c-3.87 0-7-3.13-7-7 0-1.93.78-3.69 2.05-4.95L8.5 8.5H3V3l2.2 2.2C6.8 3.56 9.25 2.5 12 2.5a9.5 9.5 0 0 1 9.5 9.5h-2.5zm-14 0a7 7 0 0 1 7-7c3.87 0 7 3.13 7 7 0 1.93-.78 3.69-2.05 4.95L15.5 15.5H21v5.5l-2.2-2.2C17.2 20.44 14.75 21.5 12 21.5A9.5 9.5 0 0 1 2.5 12h2.5z"/></svg>
          </button>
          <button class="action-btn" id="forceGithubBtn" title="Force Sync to GitHub (Bypass 24h Lock)">
            <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
          </button>
          <button class="action-btn" id="clearBtn" title="Clear Saved Codes">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
          <button class="action-btn" id="minimizeBtn" title="Minimize Panel">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
          </button>
        </div>
      </div>

      <!-- Loading screen -->
      <div class="loading-screen pokefriends-hidden" id="loadingScreen">
        <div class="spinner-pokeball"></div>
        <div class="loading-text">Scanning megathread comments...</div>
      </div>

      <!-- Main List screen -->
      <div class="list-screen" id="listScreen">
        <div class="list-toolbar">
          <input type="text" class="search-input" id="searchInput" placeholder="Filter codes...">
          <button class="copy-all-btn" id="copyAllBtn">Copy All</button>
        </div>
        <div class="stats-bar">
          <span id="statsCount">0 codes found</span>
          <span id="githubStatus" class="github-status" title="GitHub sync status">GitHub: Pending</span>
        </div>
        <div class="codes-scrollview" id="codesList">
          <!-- Codes will be rendered dynamically -->
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(panel);

  // References to DOM Elements within Shadow DOM
  const minimizedBadge = shadow.getElementById("minimizedBadge");
  const loadingScreen = shadow.getElementById("loadingScreen");
  const listScreen = shadow.getElementById("listScreen");
  const codesList = shadow.getElementById("codesList");

  const syncBtn = shadow.getElementById("syncBtn");
  const forceGithubBtn = shadow.getElementById("forceGithubBtn");
  const clearBtn = shadow.getElementById("clearBtn");
  const minimizeBtn = shadow.getElementById("minimizeBtn");
  const copyAllBtn = shadow.getElementById("copyAllBtn");
  const searchInput = shadow.getElementById("searchInput");

  const statsCount = shadow.getElementById("statsCount");
  const githubStatus = shadow.getElementById("githubStatus");

  // State variables
  let friendCodes = [];
  let hasFetchedThisSession = false;

  // Initialize: Load cached codes from local storage
  chrome.storage.local.get({ friendCodes: [] }, (result) => {
    friendCodes = result.friendCodes || [];
    renderCodes();
    updateGitHubStatusLabel("Pending", "Sync pending. Click the badge or sync buttons to trigger.");
  });

  // Toggle Minimized/Maximized
  minimizedBadge.addEventListener("click", () => {
    panel.classList.remove("minimized");
    if (!hasFetchedThisSession) {
      startFetchAndProcess(false); // Run automatic fetch and sync on first click
    }
  });

  minimizeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.add("minimized");
  });

  // Listen for messages from background script (extension icon clicks)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "open_ui") {
      panel.classList.remove("minimized");
      if (!hasFetchedThisSession) {
        startFetchAndProcess(false);
      }
    }
  });

  // Sync / Refresh trigger
  syncBtn.addEventListener("click", () => {
    startFetchAndProcess(false);
  });

  // Force GitHub sync trigger (bypass 24h cooldown)
  forceGithubBtn.addEventListener("click", () => {
    if (friendCodes.length === 0) {
      alert("No codes collected yet to sync.");
      return;
    }
    triggerGitHubSync(friendCodes, true);
  });

  // Clear trigger
  clearBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all saved friend codes?")) {
      chrome.storage.local.set({ friendCodes: [] }, () => {
        friendCodes = [];
        renderCodes();
        updateGitHubStatusLabel("Pending", "Local storage cleared.");
      });
    }
  });

  // Copy All button
  copyAllBtn.addEventListener("click", () => {
    const filtered = getFilteredCodes();
    if (filtered.length === 0) return;

    const textToCopy = filtered.join("\n");
    navigator.clipboard.writeText(textToCopy).then(() => {
      const oldText = copyAllBtn.textContent;
      copyAllBtn.textContent = "Copied All!";
      copyAllBtn.style.background = "rgba(34, 197, 94, 0.2)";
      copyAllBtn.style.color = "#4ade80";
      copyAllBtn.style.borderColor = "rgba(34, 197, 94, 0.4)";

      setTimeout(() => {
        copyAllBtn.textContent = oldText;
        copyAllBtn.style.background = "";
        copyAllBtn.style.color = "";
        copyAllBtn.style.borderColor = "";
      }, 2000);
    }).catch(err => {
      console.error("Clipboard copy failed:", err);
    });
  });

  // Filter typing event listener
  searchInput.addEventListener("input", renderCodes);

  // Screen Switcher Helper
  function showLoading(isLoading) {
    if (isLoading) {
      loadingScreen.classList.remove("pokefriends-hidden");
      listScreen.classList.add("pokefriends-hidden");
    } else {
      loadingScreen.classList.add("pokefriends-hidden");
      listScreen.classList.remove("pokefriends-hidden");
    }
  }

  // Helper to update GitHub status label
  function updateGitHubStatusLabel(type, title) {
    githubStatus.className = "github-status";
    githubStatus.title = title;

    if (type === "Success") {
      githubStatus.textContent = "GitHub: Synced";
      githubStatus.classList.add("success");
    } else if (type === "Cooldown") {
      githubStatus.textContent = "GitHub: Cooldown";
      githubStatus.classList.add("warning");
    } else if (type === "Error") {
      githubStatus.textContent = "GitHub: Error";
      githubStatus.classList.add("error");
    } else if (type === "Syncing") {
      githubStatus.textContent = "GitHub: Syncing...";
      githubStatus.classList.add("warning");
    } else {
      githubStatus.textContent = "GitHub: Ready";
    }
  }

  // Fetch comments and scan for friend codes
  function startFetchAndProcess(forceGithub = false) {
    showLoading(true);
    updateGitHubStatusLabel("Syncing", "Syncing with GitHub...");

    const fetchUrl = "https://www.reddit.com/r/PokemonGoFriends/comments/1rz0wer/friendship_exp_gift_exchange_megathread.json?limit=500";

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Reddit HTTP status error: " + res.status);
        return res.json();
      })
      .then((data) => {
        const foundCodes = new Set();
        const codeRegex = /\b\d{4}[\s-]*\d{4}[\s-]*\d{4}\b/g;

        function scanText(text) {
          if (!text) return;
          let match;
          while ((match = codeRegex.exec(text)) !== null) {
            const clean = match[0].replace(/\D/g, "");
            if (clean.length === 12) {
              foundCodes.add(clean);
            }
          }
        }

        function scanComments(commentsList) {
          if (!commentsList || !Array.isArray(commentsList)) return;
          for (const item of commentsList) {
            if (item.kind === "t1" && item.data) {
              scanText(item.data.body);
              if (item.data.replies && item.data.replies.data) {
                scanComments(item.data.replies.data.children);
              }
            }
          }
        }

        if (Array.isArray(data) && data[1] && data[1].data) {
          scanComments(data[1].data.children);
        }

        const newCodes = Array.from(foundCodes);

        // Merge with existing codes in local storage
        chrome.storage.local.get({ friendCodes: [] }, (result) => {
          const existing = result.friendCodes || [];
          const combined = Array.from(new Set([...existing, ...newCodes]));
          
          chrome.storage.local.set({ friendCodes: combined }, () => {
            friendCodes = combined;
            hasFetchedThisSession = true;
            renderCodes();
            showLoading(false);

            // Trigger secure background synchronization to GitHub
            triggerGitHubSync(combined, forceGithub);
          });
        });
      })
      .catch((error) => {
        console.error("Failed to fetch PokeFriends codes:", error);
        showLoading(false);
        updateGitHubStatusLabel("Error", "Reddit scan failed: " + error.message);
      });
  }

  // Securely trigger GitHub sync via the background page
  function triggerGitHubSync(codes, force = false) {
    updateGitHubStatusLabel("Syncing", "Contacting background service worker...");

    chrome.runtime.sendMessage({
      action: "sync_github",
      codes: codes,
      force: force
    }, (response) => {
      // Handle response from background script
      if (chrome.runtime.lastError) {
        console.error("Extension runtime error during GitHub sync:", chrome.runtime.lastError);
        updateGitHubStatusLabel("Error", "Could not connect to background extension worker: " + chrome.runtime.lastError.message);
        return;
      }

      if (!response) {
        updateGitHubStatusLabel("Error", "No response received from background extension sync worker.");
        return;
      }

      if (response.success) {
        updateGitHubStatusLabel("Success", `Sync completed. Repo has ${response.count} codes total.`);
      } else {
        if (response.skipped) {
          updateGitHubStatusLabel("Cooldown", response.error);
        } else {
          updateGitHubStatusLabel("Error", response.error);
        }
      }
    });
  }

  // Get current list of codes filtered by the search query
  function getFilteredCodes() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return friendCodes;
    return friendCodes.filter(code => code.includes(query));
  }

  // Formats code as 'XXXX XXXX XXXX' for UI
  function formatCode(code) {
    return `${code.substring(0, 4)} ${code.substring(4, 8)} ${code.substring(8, 12)}`;
  }

  // Render codes list
  function renderCodes() {
    const filtered = getFilteredCodes();
    codesList.innerHTML = "";

    statsCount.textContent = `${filtered.length} codes listed`;

    if (filtered.length === 0) {
      codesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <div class="empty-state-text">No friend codes found</div>
        </div>
      `;
      return;
    }

    filtered.forEach((code) => {
      const card = document.createElement("div");
      card.className = "code-card";

      const info = document.createElement("div");
      info.className = "code-info";

      const val = document.createElement("span");
      val.className = "code-value";
      val.textContent = formatCode(code);
      info.appendChild(val);
      card.appendChild(info);

      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        Copy
      `;

      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.classList.add("copied");
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            Copied!
          `;

          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              Copy
            `;
          }, 2000);
        });
      });

      card.appendChild(copyBtn);
      codesList.appendChild(card);
    });
  }
})();
