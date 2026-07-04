const TARGET_URL =
  "https://www.reddit.com/r/PokemonGoFriends/comments/1rz0wer/friendship_exp_gift_exchange_megathread/";

// Redirect user or toggle UI on extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  if (!tab.url || !tab.url.startsWith("https://www.reddit.com")) {
    chrome.tabs.create({ url: TARGET_URL });
  } else {
    chrome.tabs.sendMessage(tab.id, { action: "open_ui" }).catch((err) => {
      console.log("Could not communicate with content script:", err);
    });
  }
});

// Handle secure API actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sync_github") {
    handleGitHubSync(message.codes, message.force, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

async function handleGitHubSync(newEntries, force, sendResponse) {
  try {
    // 1. Fetch the env.json configuration file securely
    const configUrl = chrome.runtime.getURL("env.json");
    const configRes = await fetch(configUrl);
    if (!configRes.ok) {
      return sendResponse({
        success: false,
        error: "Failed to load env.json configuration file.",
      });
    }
    const env = await configRes.json();

    // Validate placeholders
    if (
      !env.GITHUB_TOKEN ||
      env.GITHUB_TOKEN.startsWith("YOUR_") ||
      !env.REPO_OWNER ||
      env.REPO_OWNER.startsWith("YOUR_") ||
      !env.REPO_NAME ||
      env.REPO_NAME.startsWith("YOUR_") ||
      !env.FILE_PATH ||
      env.FILE_PATH.startsWith("YOUR_")
    ) {
      return sendResponse({
        success: false,
        error:
          "GitHub configurations in env.json are still set to placeholder values. Please edit env.json on your PC first.",
      });
    }

    // 2. Validate Cooldown (24-hour rate limit)
    const storage = await chrome.storage.local.get(["lastGithubUpdate"]);
    const lastUpdate = storage.lastGithubUpdate || 0;
    const now = Date.now();
    const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (!force && lastUpdate && now - lastUpdate < cooldownPeriod) {
      const remainingTime = cooldownPeriod - (now - lastUpdate);
      const hours = Math.floor(remainingTime / (1000 * 60 * 60));
      const minutes = Math.floor(
        (remainingTime % (1000 * 60 * 60)) / (1000 * 60),
      );
      return sendResponse({
        success: false,
        skipped: true,
        error: `Skipped: GitHub sync is rate-limited to once every 24 hours. (Lock ends in ${hours}h ${minutes}m)`,
      });
    }

    // 3. GitHub API calls
    const url = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${env.FILE_PATH}`;
    const headers = {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    let sha = null;
    let existingData = null;

    // A. Read the current file to get the SHA and current codes
    const getRes = await fetch(url, { headers });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      // Decode content from base64 (remove potential whitespaces)
      const existingContent = atob(fileData.content.replace(/\s/g, ""));
      if (existingContent.trim()) {
        try {
          existingData = JSON.parse(existingContent);
        } catch (e) {
          console.warn(
            "Failed to parse existing JSON on GitHub, overwriting instead:",
            e,
          );
        }
      }
    } else if (getRes.status !== 404) {
      return sendResponse({
        success: false,
        error: `GitHub GET failed (Status ${getRes.status}): ${getRes.statusText}`,
      });
    }

    // Extract raw array of entries from existing file based on wrapper
    let existingArray = [];
    if (existingData) {
      if (Array.isArray(existingData.data)) {
        existingArray = existingData.data;
      } else if (Array.isArray(existingData)) {
        existingArray = existingData;
      }
    }

    // B. Merge existing entries with new entries, deduplicating on "f_code"
    const uniqueMap = new Map();
    // Add existing first
    existingArray.forEach((entry) => {
      if (entry && entry.f_code) {
        uniqueMap.set(entry.f_code, entry);
      }
    });
    // Add new (overwrites/updates existing metadata if conflict)
    newEntries.forEach((entry) => {
      if (entry && entry.f_code) {
        uniqueMap.set(entry.f_code, entry);
      }
    });

    const mergedArray = Array.from(uniqueMap.values());

    // C. Wrap the array in the required JSON envelope
    const timestampStr = new Date(now).toISOString();
    const wrappedResult = {
      last_updated_at: timestampStr,
      data: mergedArray,
    };

    // D. Encode updated content
    const formattedContent = JSON.stringify(wrappedResult, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(formattedContent)));

    // E. PUT request to upload the file to GitHub
    const commitBody = {
      message: `Sync Pokemon Go Friend Codes (Total: ${mergedArray.length})`,
      content: base64Content,
    };
    if (sha) {
      commitBody.sha = sha;
    }

    const putRes = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(commitBody),
    });

    if (!putRes.ok) {
      return sendResponse({
        success: false,
        error: `GitHub PUT failed (Status ${putRes.status}): ${putRes.statusText}`,
      });
    }

    // 4. Update the sync lock timestamp on success
    await chrome.storage.local.set({ lastGithubUpdate: now });

    sendResponse({
      success: true,
      count: mergedArray.length,
      timestamp: now,
    });
  } catch (err) {
    console.error("Error during GitHub sync operation:", err);
    sendResponse({ success: false, error: err.message });
  }
}
