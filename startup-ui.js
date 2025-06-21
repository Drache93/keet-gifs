// Startup UI Module - Handles the initial app startup interface
class StartupUI {
  constructor() {
    this.elements = {
      container: document.querySelector("#startup-container"),
    };

    this.showMainOptions(); // Initialize with main options
    this.hideLoader(); // Hide the loader when startup UI is ready
  }

  hideLoader() {
    const loader = document.querySelector("#loader");
    if (loader) {
      loader.classList.add("hidden");
    }
  }

  initializeEventListeners() {
    // Get fresh references to elements after DOM creation
    this.elements.startNewButton = document.querySelector("#start-new-button");
    this.elements.joinWithInviteButton = document.querySelector(
      "#join-invite-button"
    );
    this.elements.inviteForm = document.querySelector("#invite-form");
    this.elements.inviteInput = document.querySelector("#invite-input");
    this.elements.joinButton = document.querySelector("#join-button");
    this.elements.backButton = document.querySelector("#back-button");
    this.elements.status = document.querySelector("#startup-status");

    // Start new app button
    if (this.elements.startNewButton) {
      this.elements.startNewButton.addEventListener("click", () => {
        this.startNewApp();
      });
    }

    // Show invite form button
    if (this.elements.joinWithInviteButton) {
      this.elements.joinWithInviteButton.addEventListener("click", () => {
        this.showInviteForm();
      });
    }

    // Join with invite form
    if (this.elements.inviteForm) {
      this.elements.inviteForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.joinWithInvite();
      });
    }

    // Back button
    if (this.elements.backButton) {
      this.elements.backButton.addEventListener("click", () => {
        this.showMainOptions();
      });
    }
  }

  showMainOptions() {
    this.elements.container.innerHTML = `
      <div class="startup-content">
        <div class="startup-header">
          <h1>Keet GIFs</h1>
          <p>Share and collaborate on GIFs with your 🍐's</p>
        </div>
        
        <div class="startup-options">
          <button id="start-new-button" class="startup-button primary">
            <span class="button-icon">🚀</span>
            <span class="button-text">
              <strong>Continue</strong>
              <small>Continue to the app</small>
            </span>
          </button>
          
          <button id="join-invite-button" class="startup-button secondary">
            <span class="button-icon">🔗</span>
            <span class="button-text">
              <strong>Join with Invite</strong>
              <small>Enter an invite code to join</small>
            </span>
          </button>
        </div>
      </div>
    `;

    // Set up event listeners after DOM elements are created
    this.initializeEventListeners();
  }

  showInviteForm() {
    this.elements.container.innerHTML = `
      <div class="startup-content">
        <div class="startup-header">
          <h1>Join with Invite</h1>
          <p>Enter your invite code to join a collaborative space</p>
        </div>
        
        <form id="invite-form" class="invite-form">
          <div class="input-group">
            <label for="invite-input">Invite Code</label>
            <input 
              id="invite-input" 
              type="text" 
              placeholder="Enter invite code..." 
              required
              autocomplete="off"
            />
          </div>
          
          <div class="button-group">
            <button type="button" id="back-button" class="startup-button secondary">
              ← Back
            </button>
            <button type="submit" id="join-button" class="startup-button primary">
              Join Space
            </button>
          </div>
        </form>
        
        <div id="startup-status" class="status-message"></div>
      </div>
    `;

    // Set up event listeners after DOM elements are created
    this.initializeEventListeners();

    // Focus on input
    setTimeout(() => {
      if (this.elements.inviteInput) {
        this.elements.inviteInput.focus();
      }
    }, 100);
  }

  startNewApp() {
    this.setStatus("Starting new app...", "info");

    // Dispatch custom event to start new app
    document.dispatchEvent(new CustomEvent("startNewApp"));
  }

  joinWithInvite() {
    const invite = this.elements.inviteInput?.value?.trim();

    if (!invite) {
      this.setStatus("Please enter an invite code", "error");
      return;
    }

    this.setStatus("Joining with invite...", "info");

    // Dispatch custom event with invite
    document.dispatchEvent(
      new CustomEvent("joinWithInvite", {
        detail: { invite },
      })
    );
  }

  setStatus(message, type = "") {
    const statusEl = this.elements.status;
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-message ${type}`;
    }
  }

  hide() {
    this.elements.container.style.display = "none";
  }

  show() {
    this.elements.container.style.display = "flex";
  }
}

export { StartupUI };
