(() => {
  const form = document.querySelector("#link-form");
  const input = document.querySelector("#video-url");
  const status = document.querySelector("#status");
  const preview = document.querySelector("#video-preview");
  const previewFrame = document.querySelector("#preview-frame");
  const downloadAction = document.querySelector("#download-action");
  const hint = document.querySelector("#input-hint");

  const adOverlay = document.querySelector("#ad-overlay");
  const adCloseBtn = document.querySelector("#ad-close-btn");
  const adTimer = document.querySelector("#ad-timer");

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

  // Force direct file download into Gallery / Downloads folder using Blob Conversion
  const downloadVideoFile = async (url, btnElement) => {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `<span>⏳ Downloading to Gallery...</span>`;
    btnElement.disabled = true;
    btnElement.style.opacity = "0.7";

    try {
      let blob = null;

      // 1. Direct Blob fetch from fbcdn.net (fbcdn has Access-Control-Allow-Origin: *)
      try {
        const response = await fetch(url);
        if (response.ok) {
          blob = await response.blob();
        }
      } catch (e) {
        console.warn("Direct blob fetch error:", e);
      }

      // 2. Fallback via CORS Proxy if direct fetch fails
      if (!blob) {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const response2 = await fetch(proxyUrl);
          if (response2.ok) {
            blob = await response2.blob();
          }
        } catch (e) {
          console.warn("Proxy fetch error:", e);
        }
      }

      if (blob) {
        // Convert Blob to Same-Origin Local URL -> Chrome CANNOT play in tab, MUST download
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "instagram_reel.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        btnElement.innerHTML = `<span>✅ Saved to Gallery!</span>`;
        setTimeout(() => {
          btnElement.innerHTML = originalText;
          btnElement.disabled = false;
          btnElement.style.opacity = "1";
        }, 3000);
        return;
      }

      // 3. Fallback: Force anchor download attribute without tab redirection
      const a = document.createElement("a");
      a.href = url;
      a.download = "instagram_reel.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      btnElement.innerHTML = `<span>✅ Video Downloading...</span>`;
      setTimeout(() => {
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
        btnElement.style.opacity = "1";
      }, 3000);
    } catch (err) {
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
      btnElement.style.opacity = "1";
    }
  };

  // RapidAPI High-Speed Instagram Reel Extraction
  const processInstagramVideo = async (instaUrl) => {
    status.className = "status is-visible";
    status.innerHTML = `<p class="status-heading">⏳ Extracting video...</p><p class="status-copy">Please wait a few seconds while we generate your download link.</p>`;
    preview.hidden = true;

    try {
      const apiUrl = `https://instagram-reels-downloader-api.p.rapidapi.com/download?url=${encodeURIComponent(instaUrl)}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "instagram-reels-downloader-api.p.rapidapi.com",
          "x-rapidapi-key": "598dedb630mshe61888c36bee6ddp1a5cf6jsn1353e2108b40"
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.statusCode || response.status}`);
      }

      const json = await response.json();

      if (json.success && json.data) {
        let mp4Url = null;

        if (Array.isArray(json.data.medias)) {
          const videoItem = json.data.medias.find(m => m.type === "video" && m.url);
          if (videoItem) {
            mp4Url = videoItem.url;
          } else if (json.data.medias[0] && json.data.medias[0].url) {
            mp4Url = json.data.medias[0].url;
          }
        }

        if (mp4Url) {
          // 1. Render Clean HTML5 Video Player
          previewFrame.replaceChildren();
          const videoElement = document.createElement("video");
          videoElement.src = mp4Url;
          if (json.data.thumbnail) {
            videoElement.poster = json.data.thumbnail;
          }
          videoElement.controls = true;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.style.width = "100%";
          videoElement.style.maxHeight = "480px";
          videoElement.style.borderRadius = "12px";
          videoElement.style.backgroundColor = "#000000";
          previewFrame.appendChild(videoElement);

          // 2. Render Download Button & Instructions
          downloadAction.replaceChildren();

          const btnContainer = document.createElement("div");
          btnContainer.style.display = "flex";
          btnContainer.style.flexDirection = "column";
          btnContainer.style.alignItems = "center";
          btnContainer.style.gap = "10px";
          btnContainer.style.width = "100%";

          const downloadBtn = document.createElement("button");
          downloadBtn.type = "button";
          downloadBtn.className = "official-button";
          downloadBtn.style.backgroundColor = "#25d366";
          downloadBtn.style.color = "#ffffff";
          downloadBtn.style.fontWeight = "bold";
          downloadBtn.style.fontSize = "16px";
          downloadBtn.style.padding = "14px 28px";
          downloadBtn.style.borderRadius = "10px";
          downloadBtn.style.border = "none";
          downloadBtn.style.cursor = "pointer";
          downloadBtn.style.display = "inline-flex";
          downloadBtn.style.alignItems = "center";
          downloadBtn.style.gap = "8px";
          downloadBtn.innerHTML = `<span>⬇️ Download Video</span>`;

          downloadBtn.addEventListener("click", () => {
            downloadVideoFile(mp4Url, downloadBtn);
          });

          btnContainer.appendChild(downloadBtn);
          downloadAction.appendChild(btnContainer);

          status.className = "status is-visible";
          status.innerHTML = `<p class="status-heading" style="color: #25d366;">✅ Video Ready!</p><p class="status-copy">Click the button below to save the video to your device.</p>`;
          preview.hidden = false;
          return;
        }
      }

      throw new Error(json.message || "Video stream not found in API response.");
    } catch (err) {
      status.className = "status is-visible is-error";
      status.innerHTML = `<p class="status-heading">❌ Extraction Failed</p><p class="status-copy">${err.message || "Please check your Instagram link and try again."}</p>`;
      preview.hidden = true;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = input.value.trim();

    if (!raw || !raw.toLowerCase().includes("instagram.com")) {
      status.className = "status is-visible is-error";
      status.innerHTML = `<p class="status-heading">Please paste a valid Instagram video link</p><p class="status-copy">Example: https://www.instagram.com/reel/...</p>`;
      preview.hidden = true;
      input.focus();
      return;
    }

    // Trigger Ad Overlay first, then process video
    triggerAdModal(() => {
      processInstagramVideo(raw);
    });
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
        hint.textContent = "Clipboard is empty. Paste your Instagram link here.";
      }
    } catch {
      input.focus();
      hint.textContent = "Clipboard access unavailable. Paste your link here.";
    }
  });
})();
