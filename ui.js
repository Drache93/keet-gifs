// UI Module - Handles all DOM manipulation and UI interactions
import { ValidationUtils } from "./utils.js";

class UI {
  constructor(driveKey) {
    this.driveKey = driveKey;

    this.elements = {
      uploadForm: document.querySelector("#upload-form"),
      fileInput: document.querySelector("#file-input"),
      uploadButton: document.querySelector("#upload-button"),
      status: document.querySelector("#status"),
      preview: document.querySelector("#preview"),
      uploadInfo: document.querySelector("#upload-info"),
      fileInputContainer: document.querySelector("#file-input-container"),
      gallery: document.querySelector("#gallery"),
      galleryGrid: document.querySelector("#gallery-grid"),
      galleryEmpty: document.querySelector("#gallery-empty"),
      refreshButton: document.querySelector("#refresh-button"),
      uploadContainer: document.querySelector("#upload-container"),
      tabs: document.querySelectorAll(".tab"),
      loader: document.querySelector("#loader"),
      inviteButton: document.querySelector("#invite-button"),
      inviteModal: document.querySelector("#invite-modal"),
      inviteLink: document.querySelector("#invite-link"),
      copyInviteButton: document.querySelector("#copy-invite"),
      closeModalButton: document.querySelector("#close-modal"),
      inviteStatus: document.querySelector("#invite-status"),
    };

    this.currentTab = "upload";

    this.initializeEventListeners();
    this.hideLoader();
  }

  hideLoader() {
    if (this.elements.loader) {
      this.elements.loader.classList.add("hidden");
    }
  }

  initializeEventListeners() {
    // Form upload handler
    this.elements.uploadForm.addEventListener(
      "submit",
      this.handleUpload.bind(this)
    );

    // File input change handler
    this.elements.fileInput.addEventListener(
      "change",
      this.handleFileSelect.bind(this)
    );

    // Drag and drop handlers
    this.elements.fileInputContainer.addEventListener(
      "dragover",
      this.handleDragOver.bind(this)
    );
    this.elements.fileInputContainer.addEventListener(
      "dragleave",
      this.handleDragLeave.bind(this)
    );
    this.elements.fileInputContainer.addEventListener(
      "drop",
      this.handleDrop.bind(this)
    );

    // Paste handler for cross-window sharing
    document.addEventListener("paste", this.handlePaste.bind(this));

    // Tab switching
    this.elements.tabs.forEach((tab) => {
      tab.addEventListener("click", this.handleTabSwitch.bind(this));
    });

    // Refresh button
    this.elements.refreshButton.addEventListener("click", () => {
      this.loadGallery();
    });

    // Refresh gallery on custom event
    document.addEventListener("refreshGallery", () => {
      console.log("refreshGallery");
      if (this.currentTab === "gallery") {
        this.loadGallery();
      }
    });

    // Modal close button handler
    this.elements.closeModalButton.addEventListener("click", () => {
      this.closeInviteModal();
    });

    // Copy invite button handler
    this.elements.copyInviteButton.addEventListener("click", () => {
      this.copyInviteToClipboard();
    });

    // Close modal when clicking outside
    this.elements.inviteModal.addEventListener("click", (e) => {
      if (e.target === this.elements.inviteModal) {
        this.closeInviteModal();
      }
    });

    // Listen for invite generation events
    document.addEventListener("inviteGenerated", (e) => {
      this.showInviteInModal(e.detail.invite);
    });

    document.addEventListener("inviteError", (e) => {
      this.showInviteError(e.detail.error);
    });

    // Listen for shared images from other windows
    document.addEventListener("imageShared", (e) => {
      this.handleSharedImage(e.detail.shareKey, e.detail.filename);
    });

    // Check for shared images on startup
    this.checkForSharedImages();

    // Global remove preview function
    window.removePreview = this.removePreview.bind(this);
  }

  // Status management
  setStatus(message, type = "") {
    this.elements.status.textContent = message;
    this.elements.status.className = type;
  }

  // Upload handling
  async handleUpload(e) {
    e.preventDefault();

    const file = this.elements.fileInput.files[0];
    const validation = ValidationUtils.validateUploadFile(file);

    console.log("validation", validation);

    if (!validation.valid) {
      this.setStatus(validation.message, "error");
      return;
    }

    try {
      this.elements.uploadButton.disabled = true;
      this.setStatus("Uploading...");

      // Emit custom event for upload
      const uploadEvent = new CustomEvent("fileUpload", {
        detail: { file },
      });
      console.log("uploadEvent", uploadEvent);
      document.dispatchEvent(uploadEvent);
    } catch (error) {
      console.error("Upload error:", error);
      this.setStatus("Upload failed: " + error.message, "error");
    } finally {
      this.elements.uploadButton.disabled = false;
    }
  }

  // File selection handling
  handleFileSelect(e) {
    const file = e.target.files[0];

    if (!file) {
      this.elements.uploadButton.disabled = true;
      this.setStatus("");
      this.elements.preview.classList.add("hidden");
      this.elements.fileInputContainer.classList.remove("has-preview");
      this.elements.uploadInfo.classList.remove("hidden");
      return;
    }

    const validation = ValidationUtils.validateUploadFile(file);
    if (!validation.valid) {
      this.setStatus(validation.message, "error");
      this.elements.uploadButton.disabled = true;
      this.elements.preview.classList.add("hidden");
      this.elements.fileInputContainer.classList.remove("has-preview");
      this.elements.uploadInfo.classList.remove("hidden");
      return;
    }

    this.elements.uploadButton.disabled = false;
    this.setStatus(`Selected: ${file.name}`);
    this.showPreview(file);
  }

  // Preview management
  showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview" />
        <div id="preview-overlay" onclick="removePreview()">✕ Remove</div>
      `;
      this.elements.preview.classList.remove("hidden");
      this.elements.fileInputContainer.classList.add("has-preview");
      this.elements.uploadInfo.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }

  removePreview() {
    this.elements.fileInput.value = "";
    this.elements.uploadButton.disabled = false;
    this.setStatus("");
    this.elements.preview.classList.add("hidden");
    this.elements.fileInputContainer.classList.remove("has-preview");
    this.elements.uploadInfo.classList.remove("hidden");
  }

  // Drag and drop handling
  handleDragOver(e) {
    e.preventDefault();
    this.elements.fileInputContainer.classList.add("dragover");
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.elements.fileInputContainer.classList.remove("dragover");
  }

  handleDrop(e) {
    e.preventDefault();
    this.elements.fileInputContainer.classList.remove("dragover");

    console.log("Drop event received:", e);
    console.log("dataTransfer types:", e.dataTransfer.types);
    console.log("dataTransfer files:", e.dataTransfer.files);
    console.log("dataTransfer items:", e.dataTransfer.items);

    // Try to get files from dataTransfer
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      console.log("Found files in dataTransfer.files:", files);
      this.elements.fileInput.files = files;
      this.elements.fileInput.dispatchEvent(new Event("change"));
      return;
    }

    // If no files in dataTransfer.files, try to get from items
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      console.log("Found items in dataTransfer.items:", items);
      // Convert items to files
      const fileList = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            fileList.push(file);
          }
        }
      }

      if (fileList.length > 0) {
        console.log("Converted items to files:", fileList);
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        fileList.forEach((file) => dataTransfer.items.add(file));
        this.elements.fileInput.files = dataTransfer.files;
        this.elements.fileInput.dispatchEvent(new Event("change"));
        return;
      }
    }

    // If we still don't have files, try to get from text data
    const textData = e.dataTransfer.getData("text/plain");
    if (textData) {
      console.log("Found text data:", textData);
      // This might be a filename, but we can't reconstruct the file
      this.setStatus("Cannot import file from text data", "error");
      return;
    }

    console.log("No usable data found in drop event");
    this.setStatus("No valid file data found in drop", "error");
  }

  // Handle paste events for cross-window sharing
  async handlePaste(e) {
    console.log("Paste event received:", e);

    // Check if we're in the upload tab and the upload container is focused
    if (this.currentTab !== "upload") return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    console.log("Clipboard types:", clipboardData.types);
    console.log("Clipboard files:", clipboardData.files);

    // Try to get files from clipboard
    const files = clipboardData.files;
    if (files.length > 0) {
      console.log("Found files in clipboard:", files);
      this.elements.fileInput.files = files;
      this.elements.fileInput.dispatchEvent(new Event("change"));
      return;
    }

    // Try to get items from clipboard
    const items = clipboardData.items;
    if (items.length > 0) {
      console.log("Found items in clipboard:", items);
      const fileList = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            fileList.push(file);
          }
        }
      }

      if (fileList.length > 0) {
        console.log("Converted clipboard items to files:", fileList);
        const dataTransfer = new DataTransfer();
        fileList.forEach((file) => dataTransfer.items.add(file));
        this.elements.fileInput.files = dataTransfer.files;
        this.elements.fileInput.dispatchEvent(new Event("change"));
        return;
      }
    }

    console.log("No usable data found in paste event");
  }

  // Tab switching
  handleTabSwitch(e) {
    const tab = e.currentTarget;
    const targetTab = tab.dataset.tab;

    // Don't handle invite button as a regular tab
    if (tab.id === "invite-button") {
      this.requestInvite();
      return;
    }

    // Update tab states
    this.elements.tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    // Show/hide containers
    if (targetTab === "upload") {
      this.elements.uploadContainer.style.display = "flex";
      this.elements.gallery.classList.remove("active");
      this.currentTab = "upload";
    } else if (targetTab === "gallery") {
      this.elements.uploadContainer.style.display = "none";
      this.elements.gallery.classList.add("active");
      this.currentTab = "gallery";
      this.loadGallery();
    }
  }

  // Gallery management
  async loadGallery() {
    try {
      // Emit custom event to request gallery data
      const galleryEvent = new CustomEvent("requestGallery");
      document.dispatchEvent(galleryEvent);
    } catch (error) {
      console.error("Error loading gallery:", error);
      this.elements.galleryGrid.innerHTML =
        "<div style='color: #ff6b6b; text-align: center;'>Error loading gallery</div>";
    }
  }

  // Update gallery display
  async updateGallery(blobs, entries) {
    if (entries && entries.length === 0) {
      this.elements.galleryGrid.innerHTML = "";
      this.elements.galleryEmpty.style.display = "block";
      return;
    }

    this.elements.galleryEmpty.style.display = "none";
    this.elements.galleryGrid.innerHTML = "";

    // Sort entries by key (filename)
    entries.sort((a, b) => a.key.localeCompare(b.key));

    for (const { key, value } of entries) {
      const gifItem = document.createElement("div");
      gifItem.className = "gif-item";

      const buff = await blobs.get(value.blob);

      // Convert buffer to blob URL for thumbnail display
      const thumbnailBlob = new Blob([buff], {
        type: key.endsWith(".gif") ? "image/gif" : "image/webp",
      });
      const thumbnailUrl = URL.createObjectURL(thumbnailBlob);

      gifItem.innerHTML = `
        <img src="${thumbnailUrl}" alt="${key}" draggable="true" />
        <div class="filename">${key}</div>
      `;

      // Add click handler to view full size - pass the buffer data instead of URL
      gifItem.addEventListener("click", () => {
        this.showFullSizeImage(buff, key);
      });

      // Add copy functionality for the image
      gifItem.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.copyImageToClipboard(buff, key);
      });

      // Add drag functionality for the image (works within same window)
      const img = gifItem.querySelector("img");
      img.addEventListener("dragstart", (e) => {
        // Create a File object from the buffer for better cross-window compatibility
        const file = new File([buff], key, {
          type: key.endsWith(".gif") ? "image/gif" : "image/webp",
        });

        // Create a blob URL for the file data
        const blob = new Blob([buff], {
          type: key.endsWith(".gif") ? "image/gif" : "image/webp",
        });
        const blobUrl = URL.createObjectURL(blob);

        // For cross-window drag, we need to use the items.add() method
        // This is the most reliable method for cross-window drag in Electron
        e.dataTransfer.items.add(file);

        // Set data formats that work well with Electron
        e.dataTransfer.setData("text/plain", key);
        e.dataTransfer.setData("text/uri-list", blobUrl);
        e.dataTransfer.setData(
          "text/html",
          `<img src="${blobUrl}" alt="${key}">`
        );

        // Set the drag image
        e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);

        // Set effect allowed
        e.dataTransfer.effectAllowed = "copy";

        console.log("Drag started with file:", key, "blobUrl:", blobUrl);

        // Clean up the blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      });

      // Add copy and download buttons to the gif item
      const buttonContainer = document.createElement("div");
      buttonContainer.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s;
      `;

      const copyButton = document.createElement("button");
      copyButton.textContent = "Copy";
      copyButton.className = "copy-gif-button";
      copyButton.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        color: #b0d944;
        border: 1px solid #b0d944;
        padding: 2px 6px;
        font-size: 0.7rem;
        cursor: pointer;
      `;

      copyButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.copyImageToClipboard(buff, key);
      });

      const shareButton = document.createElement("button");
      shareButton.textContent = "Share";
      shareButton.className = "share-gif-button";
      shareButton.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        color: #b0d944;
        border: 1px solid #b0d944;
        padding: 2px 6px;
        font-size: 0.7rem;
        cursor: pointer;
      `;

      shareButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.shareImageAcrossWindows(buff, key);
      });

      const downloadButton = document.createElement("button");
      downloadButton.textContent = "Download";
      downloadButton.className = "download-gif-button";
      downloadButton.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        color: #b0d944;
        border: 1px solid #b0d944;
        padding: 2px 6px;
        font-size: 0.7rem;
        cursor: pointer;
      `;

      downloadButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.downloadImage(buff, key);
      });

      buttonContainer.appendChild(copyButton);
      buttonContainer.appendChild(shareButton);
      buttonContainer.appendChild(downloadButton);

      gifItem.style.position = "relative";
      gifItem.appendChild(buttonContainer);

      // Show buttons on hover
      gifItem.addEventListener("mouseenter", () => {
        buttonContainer.style.opacity = "1";
      });

      gifItem.addEventListener("mouseleave", () => {
        buttonContainer.style.opacity = "0";
      });

      this.elements.galleryGrid.appendChild(gifItem);
    }
  }

  // Show full size image in modal
  showFullSizeImage(buffer, filename) {
    // Create a new blob URL for the full-size view
    const blob = new Blob([buffer], {
      type: filename.endsWith(".gif") ? "image/gif" : "image/webp",
    });
    const url = URL.createObjectURL(blob);

    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      cursor: pointer;
    `;

    const imgContainer = document.createElement("div");
    imgContainer.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      text-align: center;
    `;

    const img = document.createElement("img");
    img.src = url;
    img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border: 2px solid #b0d944;
      border-radius: 8px;
    `;

    const filenameDiv = document.createElement("div");
    filenameDiv.textContent = filename;
    filenameDiv.style.cssText = `
      color: #b0d944;
      margin-top: 1rem;
      font-family: monospace;
    `;

    imgContainer.appendChild(img);
    imgContainer.appendChild(filenameDiv);
    modal.appendChild(imgContainer);

    // Close modal on click
    modal.addEventListener("click", () => {
      document.body.removeChild(modal);
      URL.revokeObjectURL(url);
    });

    document.body.appendChild(modal);
  }

  // Success callback for uploads
  onUploadSuccess(filename, file) {
    this.setStatus(`Successfully uploaded ${filename}`, "success");

    // Clear the form completely
    this.elements.fileInput.value = "";
    this.elements.uploadButton.disabled = true;
    this.elements.preview.classList.add("hidden");
    this.elements.fileInputContainer.classList.remove("has-preview");
    this.elements.uploadInfo.classList.remove("hidden");

    // Refresh gallery if it's currently active
    if (this.elements.gallery.classList.contains("active")) {
      this.loadGallery();
    }
  }

  // Error callback for uploads
  onUploadError(error) {
    console.error("Upload error:", error);
    this.setStatus("Upload failed: " + error.message, "error");
    this.elements.uploadButton.disabled = false;
  }

  // Invite management methods
  requestInvite() {
    // Show loading state
    this.elements.inviteStatus.textContent = "Generating invite...";
    this.elements.inviteStatus.className = "invite-status";

    // Emit custom event to request invite generation
    const inviteEvent = new CustomEvent("requestInvite");
    document.dispatchEvent(inviteEvent);
  }

  showInviteInModal(invite) {
    // Update the invite link input
    this.elements.inviteLink.value = invite;

    // Clear status
    this.elements.inviteStatus.textContent = "";
    this.elements.inviteStatus.className = "invite-status";

    // Show the modal
    this.elements.inviteModal.classList.remove("hidden");

    // Focus the input for easy selection
    this.elements.inviteLink.focus();
    this.elements.inviteLink.select();
  }

  showInviteError(error) {
    this.elements.inviteStatus.textContent = `Error: ${error}`;
    this.elements.inviteStatus.className = "invite-status error";
  }

  closeInviteModal() {
    this.elements.inviteModal.classList.add("hidden");
    this.elements.inviteStatus.textContent = "";
    this.elements.inviteStatus.className = "invite-status";
  }

  async copyInviteToClipboard() {
    try {
      await navigator.clipboard.writeText(this.elements.inviteLink.value);
      this.elements.inviteStatus.textContent = "Copied to clipboard!";
      this.elements.inviteStatus.className = "invite-status success";

      // Clear success message after 2 seconds
      setTimeout(() => {
        this.elements.inviteStatus.textContent = "";
        this.elements.inviteStatus.className = "invite-status";
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      this.elements.inviteStatus.textContent = "Failed to copy to clipboard";
      this.elements.inviteStatus.className = "invite-status error";
    }
  }

  // Share image across windows using Pear's shared storage
  async shareImageAcrossWindows(buffer, filename) {
    try {
      // Create a unique key for this shared image
      const shareKey = `shared-image-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store the image data in localStorage with metadata
      const imageData = {
        buffer: Array.from(buffer), // Convert buffer to array for localStorage
        filename: filename,
        type: filename.endsWith(".gif") ? "image/gif" : "image/webp",
        timestamp: Date.now(),
        shareKey: shareKey,
      };

      localStorage.setItem(shareKey, JSON.stringify(imageData));

      // Also store in sessionStorage for immediate access
      sessionStorage.setItem(shareKey, JSON.stringify(imageData));

      // Create a custom event to notify other windows
      const shareEvent = new CustomEvent("imageShared", {
        detail: { shareKey, filename },
      });
      document.dispatchEvent(shareEvent);

      this.setStatus(`Shared ${filename} across windows!`, "success");

      setTimeout(() => {
        this.setStatus("");
      }, 2000);

      console.log(`Shared ${filename} with key: ${shareKey}`);

      return shareKey;
    } catch (error) {
      console.error("Failed to share image:", error);
      this.setStatus("Failed to share image", "error");
    }
  }

  // Copy image to clipboard for cross-window sharing
  async copyImageToClipboard(buffer, filename) {
    try {
      // Create a blob from the buffer
      const blob = new Blob([buffer], {
        type: filename.endsWith(".gif") ? "image/gif" : "image/webp",
      });

      // For WebP files, we need to convert to PNG since clipboard doesn't support WebP
      if (filename.endsWith(".webp")) {
        // Convert WebP to PNG using canvas
        const img = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        return new Promise((resolve, reject) => {
          img.onload = async () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
              canvas.toBlob(async (pngBlob) => {
                const clipboardItem = new ClipboardItem({
                  "image/png": pngBlob,
                });

                await navigator.clipboard.write([clipboardItem]);
                this.setStatus(
                  `Copied ${filename} to clipboard! (Note: Animation lost in conversion)`,
                  "success"
                );

                setTimeout(() => {
                  this.setStatus("");
                }, 2000);

                console.log(
                  `Copied ${filename} to clipboard (converted to PNG)`
                );
                resolve();
              }, "image/png");
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () =>
            reject(new Error("Failed to load image for conversion"));
          img.src = URL.createObjectURL(blob);
        });
      } else {
        // For GIF files, use the original blob
        const clipboardItem = new ClipboardItem({
          "image/gif": blob,
        });

        await navigator.clipboard.write([clipboardItem]);
        this.setStatus(`Copied ${filename} to clipboard!`, "success");

        setTimeout(() => {
          this.setStatus("");
        }, 2000);

        console.log(`Copied ${filename} to clipboard`);
      }
    } catch (error) {
      console.error("Failed to copy image to clipboard:", error);
      this.setStatus("Failed to copy image to clipboard", "error");
    }
  }

  // Download image to file system for cross-window sharing
  downloadImage(buffer, filename) {
    try {
      // Create a blob from the buffer
      const blob = new Blob([buffer], {
        type: filename.endsWith(".gif") ? "image/gif" : "image/webp",
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up the URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      this.setStatus(`Downloaded ${filename}!`, "success");

      setTimeout(() => {
        this.setStatus("");
      }, 2000);

      console.log(`Downloaded ${filename}`);
    } catch (error) {
      console.error("Failed to download image:", error);
      this.setStatus("Failed to download image", "error");
    }
  }

  // Handle shared images from other windows
  async handleSharedImage(shareKey, filename) {
    try {
      console.log(`Received shared image: ${filename} with key: ${shareKey}`);

      // Get the shared image data
      const imageDataStr =
        localStorage.getItem(shareKey) || sessionStorage.getItem(shareKey);
      if (!imageDataStr) {
        console.log("No shared image data found");
        return;
      }

      const imageData = JSON.parse(imageDataStr);
      const buffer = new Uint8Array(imageData.buffer);

      // Create a File object from the shared data
      const file = new File([buffer], filename, {
        type: imageData.type,
      });

      // Set the file in the upload input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      this.elements.fileInput.files = dataTransfer.files;
      this.elements.fileInput.dispatchEvent(new Event("change"));

      // Switch to upload tab
      this.switchToUploadTab();

      this.setStatus(`Received shared image: ${filename}`, "success");

      setTimeout(() => {
        this.setStatus("");
      }, 2000);

      // Clean up the shared data
      localStorage.removeItem(shareKey);
      sessionStorage.removeItem(shareKey);
    } catch (error) {
      console.error("Failed to handle shared image:", error);
      this.setStatus("Failed to handle shared image", "error");
    }
  }

  // Check for shared images on startup
  checkForSharedImages() {
    try {
      // Check localStorage and sessionStorage for shared images
      const keys = [
        ...Object.keys(localStorage),
        ...Object.keys(sessionStorage),
      ];
      const sharedImageKeys = keys.filter((key) =>
        key.startsWith("shared-image-")
      );

      if (sharedImageKeys.length > 0) {
        console.log(`Found ${sharedImageKeys.length} shared images`);
        // Handle the most recent one
        const mostRecentKey = sharedImageKeys.sort().pop();
        const imageDataStr =
          localStorage.getItem(mostRecentKey) ||
          sessionStorage.getItem(mostRecentKey);

        if (imageDataStr) {
          const imageData = JSON.parse(imageDataStr);
          this.handleSharedImage(mostRecentKey, imageData.filename);
        }
      }
    } catch (error) {
      console.error("Failed to check for shared images:", error);
    }
  }

  // Switch to upload tab
  switchToUploadTab() {
    // Find and click the upload tab
    const uploadTab = document.querySelector('[data-tab="upload"]');
    if (uploadTab) {
      uploadTab.click();
    }
  }
}

export default UI;
