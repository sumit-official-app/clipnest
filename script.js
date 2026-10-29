(() => {
  const platforms = {
    instagram: {
      name: "Instagram",
      placeholder: "https://www.instagram.com/reel/...",
      hint: "Supports instagram.com post, reel, and TV links.",
      hosts: ["instagram.com", "www.instagram.com", "m.instagram.com"],
      matches: path => /^\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?/i.test(path),
      guidance: "Use Instagram's in-app save or download options when available. You can only save content when you have permission; creator download settings still apply.",
      official: "https://www.instagram.com/"
    },
    youtube: {
      name: "YouTube",
      placeholder: "https://www.youtube.com/watch?v=...",
      hint: "Supports youtube.com and youtu.be video links.",
      hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"],
      matches: (path, url) => {
        if (["youtu.be", "www.youtu.be"].includes(url.hostname)) return /^\/[A-Za-z0-9_-]{11}\/?$/.test(path);
        return /^\/(watch|shorts|embed|live)\/?/i.test(path) &&
          (path.toLowerCase() !== "/watch" || /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get("v") || "")) &&
          (path.toLowerCase() === "/watch" || /^\/(shorts|embed|live)\/[A-Za-z0-9_-]{11}\/?$/i.test(path));
      },
      guidance: "For your own videos, download them from YouTube Studio. YouTube Premium may offer offline viewing in the app. Availability depends on your account and region.",
      official: "https://www.youtube.com/"
    },
    tiktok: {
      name: "TikTok",
      placeholder: "https://www.tiktok.com/@creator/video/...",
      hint: "Supports tiktok.com video links and TikTok share links.",
      hosts: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
      matches: (path, url) => {
        if (["vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname)) return /^\/[A-Za-z0-9]+\/?$/.test(path);
        return /^\/(@[^/]+\/video\/\d+|t\/[A-Za-z0-9]+)\/?$/i.test(path);
      },
      guidance: "Open the video in TikTok and choose Share > Save video when the creator allows downloads. TikTok's own download may include its watermark.",
      official: "https://www.tiktok.com/"
    }
  };

  const form = document.querySelector("#link-form");
  const input = document.querySelector("#video-url");
  const status = document.querySelector("#status");
  const preview = document.querySelector("#video-preview");
  const previewFrame = document.querySelector("#preview-frame");
  const downloadAction = document.querySelector("#download-action");
  const hint = document.querySelector("#input-hint");
  const platformButtons = [...document.querySelectorAll(".platform")];

  const adOverlay = document.querySelector("#ad-overlay");
  const adCloseBtn = document.querySelector("#ad-close-btn");
  const adTimer = document.querySelector("#ad-timer");

  let selectedPlatform = "youtube";
  let pendingCallback = null;

  // Interstitial Ad Modal Timer Logic
  const triggerAdModal = (callback) => {
    pendingCallback = callback;
    let timeLeft = 3;
    adTimer.textContent = String(timeLeft);
    adCloseBtn.disabled = true;
    adCloseBtn.textContent = `Skip Ad in ${timeLeft}s`;
    adOverlay.hidden = false;

    const countdown = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(countdown);
        adCloseBtn.disabled = false;
        adCloseBtn.textContent = "Close Ad ✖";
      } else {
        adTimer.textContent = String(timeLeft);
        adCloseBtn.textContent = `Skip Ad in ${timeLeft}s`;
      }
    }, 1000);
  };

  adCloseBtn.addEventListener("click", () => {
    if (adCloseBtn.disabled) return;
    adOverlay.hidden = true;
    if (typeof pendingCallback === "function") {
      const cb = pendingCallback;
      pendingCallback = null;
      cb();
    }
  });

  const setPlatform = (key) => {
    selectedPlatform = key;
    const platform = platforms[key];
    platformButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.platform === key)));
    input.placeholder = platform.placeholder;
    hint.textContent = platform.hint;
    status.className = "status";
    status.textContent = "";
    preview.hidden = true;
    previewFrame.replaceChildren();
    downloadAction.replaceChildren();
  };

  const parseMatchingLink = (raw, platform) => {
    let url;
    try {
      url = new URL(raw.trim());
    } catch {
      return false;
    }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return false;
    if (!platform.hosts.includes(url.hostname.toLowerCase())) return false;
    return platform.matches(url.pathname, url);
  };

  const getEmbedUrl = (platformKey, url) => {
    if (platformKey === "youtube") {
      const videoId = ["youtu.be", "www.youtu.be"].includes(url.hostname.toLowerCase())
        ? url.pathname.slice(1).split("/")[0]
        : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      return { src: `https://www.youtube-nocookie.com/embed/${videoId}`, vertical: false };
    }
    if (platformKey === "instagram") {
      const match = url.pathname.match(/^\/(p|reel|reels|tv)\/([^/]+)/i);
      return match ? { src: `https://www.instagram.com/${match[1]}/${match[2]}/embed/`, vertical: true } : null;
    }
    if (platformKey === "tiktok") {
      const match = url.pathname.match(/\/video\/(\d+)/i);
      return match ? { src: `https://www.tiktok.com/player/v1/${match[1]}`, vertical: true } : null;
    }
    return null;
  };

  const showPreview = (platformKey, platform, safeUrl) => {
    const embed = getEmbedUrl(platformKey, safeUrl);
    previewFrame.classList.toggle("is-vertical", Boolean(embed && embed.vertical));
    if (embed) {
      const iframe = document.createElement("iframe");
      iframe.src = embed.src;
      iframe.title = `${platform.name} video preview`;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      previewFrame.replaceChildren(iframe);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "preview-fallback";
      const message = document.createElement("p");
      message.textContent = `This share link can't be previewed here. Open it on ${platform.name} to view the video.`;
      fallback.append(message);
      previewFrame.replaceChildren(fallback);
    }

    const link = document.createElement("a");
    link.className = "official-button";
    link.href = "#";
    link.textContent = "Download now";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      // Show Interstitial Ad before opening download URL
      triggerAdModal(() => {
        window.open(safeUrl.href, "_blank", "noopener,noreferrer");
      });
    });

    downloadAction.replaceChildren(link);
    preview.hidden = false;
  };

  const renderStatus = (valid, platform, safeUrl, platformKey) => {
    status.className = `status is-visible${valid ? "" : " is-error"}`;
    if (!valid) {
      status.innerHTML = `<p class="status-heading"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5m0 4h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>That doesn't look like a ${platform.name} video link</p><p class="status-copy">Choose the matching platform and paste a valid video URL to continue.</p>`;
      preview.hidden = true;
      return;
    }
    status.replaceChildren();
    const heading = document.createElement("p");
    heading.className = "status-heading";
    heading.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    heading.append(document.createTextNode(`${platform.name} link looks good`));
    const copy = document.createElement("p");
    copy.className = "status-copy";
    copy.textContent = platform.guidance;
    status.append(heading, copy);
    showPreview(platformKey, platform, safeUrl);
  };

  platformButtons.forEach(button => button.addEventListener("click", () => setPlatform(button.dataset.platform)));

  form.addEventListener("submit", event => {
    event.preventDefault();
    const platform = platforms[selectedPlatform];
    const raw = input.value.trim();
    if (!raw) {
      status.className = "status is-visible is-error";
      status.innerHTML = '<p class="status-heading">Paste a video link to get started</p><p class="status-copy">The link is checked locally in your browser.</p>';
      preview.hidden = true;
      input.focus();
      return;
    }
    let safeUrl;
    try { safeUrl = new URL(raw); } catch { safeUrl = null; }

    const isValid = Boolean(safeUrl && parseMatchingLink(raw, platform));

    if (isValid) {
      // Trigger 3-second Ad Overlay before revealing preview
      triggerAdModal(() => {
        renderStatus(true, platform, safeUrl, selectedPlatform);
      });
    } else {
      renderStatus(false, platform, safeUrl, selectedPlatform);
    }
  });

  input.addEventListener("input", () => {
    if (status.classList.contains("is-visible")) {
      status.className = "status";
      status.textContent = "";
      preview.hidden = true;
      previewFrame.replaceChildren();
      downloadAction.replaceChildren();
    }
  });

  document.querySelector("#paste-button").addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        input.value = text.trim();
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        input.focus();
        hint.textContent = "Clipboard is empty. Paste your link here.";
      }
    } catch {
      input.focus();
      hint.textContent = "Clipboard access is unavailable. Paste your link here.";
    }
  });
})();
