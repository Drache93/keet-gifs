import Hyperswarm from "hyperswarm";
import BlindPairing from "blind-pairing";
import Autobase from "autobase";
import Corestore from "corestore";
import ReadyResource from "ready-resource";
import z32 from "z32";
import b4a from "b4a";
import UI from "./ui.js";
import { FileUtils } from "./utils.js";
import { GifView } from "./view.js";

// Initialize Hyperdrive infrastructure
export class GifApp extends ReadyResource {
  constructor(invite = null, dir = Pear.config.storage) {
    super();
    this.store = new Corestore(dir);
    console.log("store", this.store);

    this.swarm = new Hyperswarm();
    this.pairing = new BlindPairing(this.swarm);

    this.member = null;
    this.invite = null;
    this.invitePublicKey = null;

    this.drive = null;
    this.ui = null;
    this.autobase = null;

    // Store the invite if provided
    this.initialInvite = invite;

    Pear.teardown(() => this.swarm.destroy());
    this.ready().catch(console.log);
  }

  async _open() {
    // Replication of the corestore instance on connection with other peers
    this.swarm.on("connection", (conn) => {
      console.log("connection established with a peer");
      this.store.replicate(conn);
    });

    // Skip autobase creation if we have an invite
    if (this.initialInvite) {
      console.log("initializing with invite");
      await this.joinWithInvite(this.initialInvite);

      console.log("completed join with invite");
      // Initialize UI after drive is ready
      this.ui = new UI(this.driveKey);
      this.setupEventListeners();

      // Notify that app is ready
      document.dispatchEvent(new CustomEvent("appReady"));
      return;
    }

    this.autobase = new Autobase(this.store, null, new GifView());

    // wait for the autobase instance to be initialized
    await this.autobase.ready();

    console.log(
      `Created autobase: ${this.autobase.key.toString("hex").substr(0, 16)}...`
    );

    // Get local writer core (feed)
    const localCore = this.store.get({ name: "local" });
    await localCore.ready();
    const localKey = localCore.key;

    // if we're not already setup, add ourselves as first writer
    if (!this.store.storage.bootstrap) {
      // Add ourselves as first writer
      await this.autobase.append({
        type: "addWriter",
        key: localKey.toString("hex"),
        addedBy: "bootstrapper",
        timestamp: Date.now(),
      });
    }

    // Setup blind-pairing to accept joiners (writers)
    this.member = this.pairing.addMember({
      discoveryKey: this.autobase.discoveryKey,
      onadd: (candidate) => this.onAddMember(candidate), // Called when a writer joins
    });
    await this.member.flushed(); // Wait until ready

    const discovery = this.swarm.join(this.autobase.discoveryKey);
    await discovery.flushed();

    // Initialize UI after drive is ready
    this.ui = new UI(this.driveKey);
    this.setupEventListeners();

    // Notify that app is ready
    document.dispatchEvent(new CustomEvent("appReady"));
  }

  async joinWithInvite(invite) {
    console.log(`Joining with invite: ${invite}`);

    // Get the local writer core (feed)
    const localCore = this.store.get({ name: "local" });
    console.log("debug: about to ready local core");
    await localCore.ready();
    console.log("debug: local core ready");
    const localKey = localCore.key; // Get the public key

    console.log("debug: about to add candidate");
    // Add this writer as a candidate to the pairing process
    const candidate = this.pairing.addCandidate({
      invite: z32.decode(invite), // Decode the invite
      userData: localKey, // Attach our public key
      onadd: (result) => this.onJoinSuccess(result), // Callback when join succeeds
    });

    console.log("debug: candidate added", candidate);

    // Return a promise that resolves when joining is complete
    return new Promise((resolve) => {
      console.log("debug: about to resolve join");
      this.resolveJoin = resolve;
    });
  }

  // Called when a writer tries to join
  async onAddMember(candidate) {
    console.log(
      `Received join request from candidate: ${candidate.inviteId
        .toString("hex")
        .substr(0, 16)}...`
    );

    try {
      // 1. Open the candidate FIRST (this is critical!)
      await candidate.open(this.invitePublicKey);
      console.log("debug: invite opened successfully");

      const writerKey = candidate.userData; // Get the writer's public key
      if (!writerKey) {
        console.log("No userData received from candidate");
        return;
      }

      console.log(
        `Adding new writer: ${writerKey.toString("hex").substr(0, 16)}...`
      );

      // 2. Add the new peer as a writer in the autobase
      await this.autobase.append({
        type: "addWriter",
        key: writerKey.toString("hex"),
        addedBy: "bootstrapper",
        timestamp: Date.now(),
      });

      // 3. Update autobase after adding writer
      await this.autobase.update();

      // 4. Send autobase key and encryption key to the new writer
      await candidate.confirm({
        key: this.autobase.key,
        encryptionKey: this.autobase.encryptionKey,
      });

      console.log("✅ New writer added successfully");

      // Show popup notification
      this.showWriterJoinedNotification(
        writerKey.toString("hex").substr(0, 16)
      );
    } catch (error) {
      console.error("Error in onAddMember:", error);
    }
  }

  // Show notification when a new writer joins
  showWriterJoinedNotification(writerId) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "writer-notification";
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">👋</div>
        <div class="notification-text">
          <strong>New collaborator joined!</strong>
          <small>Writer ${writerId}...</small>
        </div>
        <button class="notification-close">✕</button>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #001601;
      border: 2px solid #b0d944;
      border-radius: 8px;
      padding: 1rem;
      color: #b0d944;
      font-family: monospace;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;

    // Add content styles
    const content = notification.querySelector(".notification-content");
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
    `;

    const icon = notification.querySelector(".notification-icon");
    icon.style.cssText = `
      font-size: 1.5rem;
      flex-shrink: 0;
    `;

    const text = notification.querySelector(".notification-text");
    text.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    `;

    text.querySelector("strong").style.cssText = `
      font-size: 0.9rem;
      color: #b0d944;
    `;

    text.querySelector("small").style.cssText = `
      font-size: 0.8rem;
      color: #888;
    `;

    const closeBtn = notification.querySelector(".notification-close");
    closeBtn.style.cssText = `
      background: transparent;
      border: 1px solid #b0d944;
      color: #b0d944;
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.3s ease;
      flex-shrink: 0;
    `;

    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "#b0d944";
      closeBtn.style.color = "#001601";
    });

    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "transparent";
      closeBtn.style.color = "#b0d944";
    });

    // Add to DOM
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Handle close button
    closeBtn.addEventListener("click", () => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.transform = "translateX(100%)";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);
  }

  // Called when joining the network is successful
  async onJoinSuccess(result) {
    console.log("Join successful, creating autobase...");
    console.log("result:", result);

    // Create an Autobase instance for collaborative log
    this.autobase = new Autobase(this.store, result.key, new GifView());
    await this.autobase.ready(); // Wait until ready

    console.log(
      `Joined autobase: ${this.autobase.key.toString("hex").substr(0, 16)}...`
    );
    console.log("Initial autobase.writable:", this.autobase.writable);

    // Join the peer-to-peer swarm for this autobase
    const discovery = this.swarm.join(this.autobase.discoveryKey);
    await discovery.flushed(); // Wait until discovery is complete

    // Wait until this writer becomes writable
    this.waitForWritable();
  }

  // Wait until this writer is allowed to write to the autobase
  waitForWritable() {
    console.log("debug: checking if writable");
    console.log("autobase.writable:", this.autobase.writable);

    // If already writable, resolve immediately
    if (this.autobase.writable) {
      console.log("✅ Already writable!");
      if (this.resolveJoin) {
        this.resolveJoin();
      }

      // Initialize UI and notify app is ready
      this.ui = new UI(this.driveKey);
      this.setupEventListeners();
      document.dispatchEvent(new CustomEvent("appReady"));

      // If this was a join operation, dispatch joinSuccess event
      if (this.initialInvite) {
        document.dispatchEvent(new CustomEvent("joinSuccess"));
      }
      return;
    }

    // Otherwise, wait for an "update" event
    const check = () => {
      console.log("debug: update event received, checking writable");
      if (this.autobase.writable) {
        console.log("✅ Now writable!");
        this.autobase.off("update", check);
        if (this.resolveJoin) {
          this.resolveJoin();
        }

        // Initialize UI and notify app is ready
        this.ui = new UI(this.driveKey);
        this.setupEventListeners();
        document.dispatchEvent(new CustomEvent("appReady"));

        // If this was a join operation, dispatch joinSuccess event
        if (this.initialInvite) {
          document.dispatchEvent(new CustomEvent("joinSuccess"));
        }
      }
    };

    console.log("debug: listening for updates");
    this.autobase.on("update", check);

    // Add a timeout for debugging
    setTimeout(() => {
      if (!this.autobase.writable) {
        console.log("⚠️ Still not writable after 10s");
        console.log("autobase.writable:", this.autobase.writable);
        console.log("autobase.writers:", this.autobase.writers);
      }
    }, 10000);
  }

  setupEventListeners() {
    // Listen for file upload events from UI
    document.addEventListener("fileUpload", async (e) => {
      console.log("fileUpload", e);
      await this.handleFileUpload(e.detail.file);
    });

    // Listen for gallery requests from UI
    document.addEventListener("requestGallery", async () => {
      await this.loadGallery();
    });

    // Listen for invite generation requests from UI
    document.addEventListener("requestInvite", async (e) => {
      try {
        const invite = await this.generateInvite();
        // Notify UI of successful invite generation
        document.dispatchEvent(
          new CustomEvent("inviteGenerated", {
            detail: { invite },
          })
        );
      } catch (error) {
        console.error("Error generating invite:", error);
        // Notify UI of error
        document.dispatchEvent(
          new CustomEvent("inviteError", {
            detail: { error: error.message },
          })
        );
      }
    });
  }

  // File upload handler
  async handleFileUpload(file) {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = b4a.from(arrayBuffer);

      // Use original filename
      const filename = file.name;

      // Check if the file already exists
      const existingFile = await this.autobase.view.get(filename);
      if (existingFile) {
        this.ui.onUploadError(new Error("File already exists"));
        return;
      }

      // Store file in the drive
      await this.autobase.append({
        blob: buffer,
        filename,
      });

      await this.autobase.update();

      // Notify UI of success
      this.ui.onUploadSuccess(filename, file);
    } catch (error) {
      this.ui.onUploadError(error);
    }
  }

  // Gallery functionality
  async loadGallery() {
    try {
      // Get all entries from the drive
      const entries = [];
      console.log("loadGallery", this.autobase);
      const drive = this.autobase.view;
      const stream = await drive.entries();

      for await (const entry of stream) {
        console.log("entry", entry);
        const { key, value } = entry;
        if (FileUtils.isImageFile(key)) {
          entries.push({ key, value });
        }
      }

      const blobs = await drive.getBlobs();

      // Update UI with gallery data
      this.ui.updateGallery(blobs, entries);
    } catch (error) {
      console.error("Error loading gallery:", error);
      this.ui.updateGallery([]);
    }
  }

  // Generate a new invite for sharing
  async generateInvite() {
    if (!this.autobase) {
      throw new Error("Autobase not initialized");
    }

    // Create invite for writers to join
    const { invite, publicKey } = BlindPairing.createInvite(this.autobase.key);
    this.invitePublicKey = publicKey;
    this.invite = z32.encode(invite); // Encode invite for sharing
    this.driveKey = this.invite;

    console.log(`Invite created: ${this.invite}`);
    console.log("key:", this.invite);

    return this.invite;
  }

  async _close() {
    if (this.member) {
      await this.member.close();
    }
    if (this.swarm) {
      await this.pairing.close();
      await this.swarm.destroy();
    }
    if (this.autobase) {
      await this.autobase.close();
    }
    if (this.store) {
      await this.store.close();
    }
  }
}
