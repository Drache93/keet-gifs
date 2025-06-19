import Hyperswarm from "hyperswarm";
import Hyperdrive from "hyperdrive";
import BlindPairing from "blind-pairing";
import Autobase from "autobase";
import Corestore from "corestore";
import z32 from "z32";
import b4a from "b4a";
import UI from "./ui.js";
import { FileUtils } from "./utils.js";

const key = Pear.config.args[0];

console.log("key", key);

// Initialize Hyperdrive infrastructure
class GifApp {
  constructor() {
    this.store = new Corestore(Pear.config.storage);
    this.swarm = new Hyperswarm();
    // this.pairing = new BlindPairing(this.swarm);
    this.drive = null;
    this.ui = null;
    this.autobase = null;

    Pear.teardown(() => this.swarm.destroy());
    this.initialize();
  }

  async initialize() {
    // Replication of the corestore instance on connection with other peers
    this.swarm.on("connection", (conn) => {
      console.log("connection established with a peer");
      this.store.replicate(conn);
    });

    const drive = new Hyperdrive(this.store);

    await drive.ready();

    this.autobase = new Autobase(
      this.store,
      key ? key : null,
      new GifView(drive)
    );

    // wait for the autobase instance to be initialized
    await this.autobase.ready();

    if (!key) {
      console.log("key:", this.autobase.key);
      this.driveKey = b4a.toString(this.autobase.key, "hex");
    }

    console.log(
      `Created autobase: ${this.autobase.key.toString("hex").substr(0, 16)}...`
    );

    // Get local writer core (feed)

    // // Add ourselves as first writer
    // await this.autobase.append({
    //   type: "addWriter",
    //   key: localKey.toString("hex"),
    //   addedBy: "bootstrapper",
    //   timestamp: Date.now(),
    // });

    // // Setup blind-pairing to accept joiners (writers)
    // this.member = this.pairing.addMember({
    //   discoveryKey: this.autobase.discoveryKey,
    //   onadd: (candidate) => this.onAddMember(candidate), // Called when a writer joins
    // });
    // await this.member.flushed(); // Wait until ready

    // // Create invite for writers to join
    // const { invite, publicKey } = BlindPairing.createInvite(this.autobase.key);
    // this.invitePublicKey = publicKey;
    // this.invite = z32.encode(invite); // Encode invite for sharing
    // console.log(`Invite created: ${this.invite}`);

    const discovery = this.swarm.join(this.autobase.discoveryKey);
    await discovery.flushed();

    // console.log("drive key:", b4a.toString(this.drive.key, "hex"));

    // Initialize UI after drive is ready
    this.ui = new UI(this.driveKey);
    this.setupEventListeners();
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
  }

  // File upload handler
  async handleFileUpload(file) {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = b4a.from(arrayBuffer);

      // Generate unique filename with timestamp
      const filename = FileUtils.generateFilename(file.name);

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
      const { drive } = this.autobase.view;
      const stream = await drive.entries();

      for await (const entry of stream) {
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
}

class GifView {
  constructor(drive) {
    this.drive = drive;
  }

  valueEncoding = "json";

  async apply(nodes, view, host) {
    console.log("applying nodes", nodes, view);

    for (const node of nodes) {
      const { value } = node;

      if (value && value.blob) {
        console.log("applying node", node);

        console.log("value", value);

        await view.drive.put(value.filename, value.blob);

        console.log("done applying node", node);
      }
    }
  }

  open(store) {
    console.log("opening state", store, this.bootstrap);

    return { drive: this.drive };
  }

  async close(view) {
    await view.drive.close();
  }
}

// Initialize the application
const app = new GifApp();
