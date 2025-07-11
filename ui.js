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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.elements.fileInput.files = files;
      this.elements.fileInput.dispatchEvent(new Event("change"));
    }
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

      // Add drag functionality for the image
      const img = gifItem.querySelector("img");
      img.addEventListener("dragstart", (e) => {
        // Create a blob URL for the file data
        const blob = new Blob([buff], {
          type: key.endsWith(".gif") ? "image/gif" : "image/webp",
        });
        const blobUrl = URL.createObjectURL(blob);

        // Set data formats that work well with Electron
        e.dataTransfer.setData("text/plain", key);
        e.dataTransfer.setData("text/uri-list", blobUrl);
        e.dataTransfer.setData(
          "text/html",
          `<img src="${blobUrl}" alt="${key}">`
        );
        e.dataTransfer.setData("application/octet-stream", blob);

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
}

export default UI;
