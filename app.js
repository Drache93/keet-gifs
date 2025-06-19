import Hyperswarm from "hyperswarm";
import Hyperdrive from "hyperdrive";
import Corestore from "corestore";
import b4a from "b4a";
import UI from "./ui.js";
import { FileUtils } from "./utils.js";

// Initialize Hyperdrive infrastructure
class GifApp {
  constructor() {
    this.store = new Corestore(Pear.config.storage);
    this.swarm = new Hyperswarm();
    this.drive = null;
    this.ui = null;

    Pear.teardown(() => this.swarm.destroy());
    this.initialize();
  }

  async initialize() {
    // Replication of the corestore instance on connection with other peers
    this.swarm.on("connection", (conn) => this.store.replicate(conn));

    // A Hyperdrive takes a Corestore because it needs to create many cores
    // One for a file metadata Hyperbee, and one for a content Hypercore
    this.drive = new Hyperdrive(this.store);

    // wait till the properties of the hyperdrive instance are initialized
    await this.drive.ready();

    const discovery = this.swarm.join(this.drive.discoveryKey);
    await discovery.flushed();

    console.log("drive key:", b4a.toString(this.drive.key, "hex"));

    // Initialize UI after drive is ready
    this.ui = new UI();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for file upload events from UI
    document.addEventListener("fileUpload", async (e) => {
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
      await this.drive.put(filename, buffer);

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
      const stream = await this.drive.entries();

      for await (const entry of stream) {
        const { key, value } = entry;
        if (FileUtils.isImageFile(key)) {
          entries.push({ key, value });
        }
      }

      const blobs = await this.drive.getBlobs();

      // Update UI with gallery data
      this.ui.updateGallery(blobs, entries);
    } catch (error) {
      console.error("Error loading gallery:", error);
      this.ui.updateGallery([]);
    }
  }

  // Mirror function for copying contents from writer-dir directory to the drive
  async mirrorDrive() {
    console.log("started mirroring changes from './gifs into the drive...");
    const mirror = local.mirror(this.drive);
    await mirror.done();
    console.log("finished mirroring:", mirror.count);
  }
}

// Initialize the application
const app = new GifApp();
