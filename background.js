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

    const branch = env.BRANCH || "data";
    const cleanArchivesFolder = env.ARCHIVES_PATH
      ? env.ARCHIVES_PATH.replace(/^\/+|\/+$/g, "")
      : "data/archives";

    // Validate placeholders
    if (
      !env.GITHUB_TOKEN ||
      env.GITHUB_TOKEN.startsWith("YOUR_") ||
      !env.REPO_OWNER ||
      env.REPO_OWNER.startsWith("YOUR_") ||
      !env.REPO_NAME ||
      env.REPO_NAME.startsWith("YOUR_") ||
      !env.FILE_PATH ||
      env.FILE_PATH.startsWith("YOUR_") ||
      !env.ARCHIVES_PATH ||
      env.ARCHIVES_PATH.startsWith("YOUR_")
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

    // 3. GitHub API Setup
    const headers = {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // A. Read the current main file from FILE_PATH to get the previous content for archiving
    const mainFileUrl = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${env.FILE_PATH}?ref=${branch}`;
    let existingRawContent = "";
    let existingData = null;

    const getRes = await fetch(mainFileUrl, { headers });
    if (getRes.ok) {
      const fileData = await getRes.json();
      existingRawContent = atob(fileData.content.replace(/\s/g, ""));
      if (existingRawContent.trim()) {
        try {
          existingData = JSON.parse(existingRawContent);
        } catch (e) {
          console.warn("Failed to parse existing JSON on GitHub:", e);
        }
      }
    } else if (getRes.status !== 404) {
      return sendResponse({
        success: false,
        error: `GitHub GET main file failed (Status ${getRes.status}): ${getRes.statusText}`,
      });
    }

    // B. Read list of existing archive files in ARCHIVES_PATH to collect their SHAs
    const archivesListUrl = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${cleanArchivesFolder}?ref=${branch}`;
    const existingArchives = [];

    const archivesRes = await fetch(archivesListUrl, { headers });
    if (archivesRes.ok) {
      const filesList = await archivesRes.json();
      if (Array.isArray(filesList)) {
        filesList.forEach((file) => {
          if (file.type === "file") {
            existingArchives.push(file);
          }
        });
      }
    } else if (archivesRes.status !== 404) {
      console.warn(
        `Failed to retrieve archives list (Status ${archivesRes.status}): ${archivesRes.statusText}`,
      );
    }

    // C. Determine if today's archive needs to be created
    let archiveCreated = false;
    let archiveItem = null;

    if (existingData && existingData.last_updated_at) {
      try {
        const lastUpdatedAt = existingData.last_updated_at;
        const utcDate = lastUpdatedAt.split("T")[0]; // YYYY-MM-DD

        if (utcDate && utcDate.length === 10) {
          const archiveFilename = `${utcDate}.json`;
          const alreadyArchived = existingArchives.some(
            (file) => file.name === archiveFilename,
          );

          if (!alreadyArchived) {
            archiveCreated = true;
            archiveItem = {
              path: `${cleanArchivesFolder}/${archiveFilename}`,
              mode: "100644",
              type: "blob",
              content: existingRawContent,
            };
            console.log(
              `Prepared today's archive write for: ${archiveFilename}`,
            );
          } else {
            console.log(
              `Archive file for date ${utcDate} already exists. Silently skipping archive write.`,
            );
          }
        }
      } catch (archiveErr) {
        console.error("Error evaluating file archiving:", archiveErr);
      }
    }

    // D. Deduplicate new entries on f_code
    const uniqueMap = new Map();
    newEntries.forEach((entry) => {
      if (entry && entry.f_code) {
        uniqueMap.set(entry.f_code, entry);
      }
    });
    const deduplicatedNewEntries = Array.from(uniqueMap.values());

    // E. Prepare the updated main file content (Newly scraped codes ONLY)
    const timestampStr = new Date(now).toISOString();
    const wrappedResult = {
      last_updated_at: timestampStr,
      data: deduplicatedNewEntries,
    };
    const formattedMainContent = JSON.stringify(wrappedResult, null, 2);

    // F. Construct Tree Items
    const treeItems = [];

    // 1. Add all existing archive files using their existing SHAs
    existingArchives.forEach((file) => {
      treeItems.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: file.sha,
      });
    });

    // 2. Add today's new archive file (if created in this session)
    if (archiveCreated && archiveItem) {
      treeItems.push(archiveItem);
    }

    // 3. Add the overwritten main file
    treeItems.push({
      path: env.FILE_PATH,
      mode: "100644",
      type: "blob",
      content: formattedMainContent,
    });

    // G. Create Git Tree (POST /git/trees)
    const treeUrl = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/git/trees`;
    const treeRes = await fetch(treeUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ tree: treeItems }),
    });

    if (!treeRes.ok) {
      return sendResponse({
        success: false,
        error: `GitHub Tree Creation failed (Status ${treeRes.status}): ${treeRes.statusText}`,
      });
    }
    const treeData = await treeRes.json();
    const treeSha = treeData.sha;

    // H. Create Parentless Git Commit (POST /git/commits, parents: [])
    const commitUrl = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/git/commits`;
    const commitRes = await fetch(commitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: `Sync Pokemon Go Friend Codes (Overwritten with ${deduplicatedNewEntries.length} items)`,
        tree: treeSha,
        parents: [], // Empty parents creates an orphan root commit
      }),
    });

    if (!commitRes.ok) {
      return sendResponse({
        success: false,
        error: `GitHub Commit Creation failed (Status ${commitRes.status}): ${commitRes.statusText}`,
      });
    }
    const commitData = await commitRes.json();
    const commitSha = commitData.sha;

    // I. Force Update Ref Pointer (PATCH /git/refs/heads/{branch})
    const refUrl = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/git/refs/heads/${branch}`;
    const patchRes = await fetch(refUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        sha: commitSha,
        force: true, // Force-overwrite the commit pointer
      }),
    });

    if (patchRes.status === 404) {
      // If reference doesn't exist yet, attempt to create it (POST /git/refs)
      const createRefUrl = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/git/refs`;
      const postRes = await fetch(createRefUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: commitSha,
        }),
      });

      if (!postRes.ok) {
        return sendResponse({
          success: false,
          error: `Failed to create branch reference (Status ${postRes.status}): ${postRes.statusText}`,
        });
      }
    } else if (!patchRes.ok) {
      return sendResponse({
        success: false,
        error: `Failed to force update branch reference (Status ${patchRes.status}): ${patchRes.statusText}`,
      });
    }

    // 4. Update the sync lock timestamp on success
    await chrome.storage.local.set({ lastGithubUpdate: now });

    sendResponse({
      success: true,
      count: deduplicatedNewEntries.length,
      timestamp: now,
    });
  } catch (err) {
    console.error("Error during GitHub sync operation:", err);
    sendResponse({ success: false, error: err.message });
  }
}
