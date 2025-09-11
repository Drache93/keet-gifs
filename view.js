import Hyperdrive from "hyperdrive";
import Hyperbee from "hyperbee";
import Hyperblobs from "hyperblobs";

export class GifView {
  valueEncoding = "json";

  _initialised = false;

  get initialised() {
    return this._initialised;
  }

  async apply(nodes, view, host) {
    console.log("applying nodes", nodes, view);
    let gifsChanged = false;

    for (const node of nodes) {
      const { value } = node;

      if (value.type === "addWriter") {
        // Add a new writer to the host
        await host.addWriter(Buffer.from(value.key, "hex"));
        continue;
      }

      if (value.blob) {
        console.log("applying node", node);

        console.log("value", value);

        // Check if the file already exists
        const existingFile = await view.get(value.filename);
        if (existingFile) {
          console.log("file already exists", value.filename);
          continue;
        }

        await view.put(value.filename, value.blob);

        console.log("done applying node", node);

        // Refresh the gallery if open
        gifsChanged = true;
      }
    }

    if (gifsChanged) {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent("refreshGallery"));
      }, 1000);
    }
  }

  open(store, base) {
    console.log("opening state", base, store, this.bootstrap);

    if (base.store) {
      this._initialised = true;
    }

    // Create underlying hypercore data structures without hyperdrive to work
    // around readying immediately
    const db = new Hyperbee(store.get("db"), {
      keyEncoding: "utf-8",
      valueEncoding: "json",
      metadata: { contentFeed: null },
      extension: false,
    });
    base.db = db;

    // Name for blobs doesnt need to be derived from the hyperbee key since
    // there is a unique namespace for the viewstore
    const blobs = new Hyperblobs(store.get("blobs"));

    console.log("base.store", base.store);
    console.log("store", store);

    const drive = new Hyperdrive(base.store, { _db: db });
    drive.blobs = blobs;
    return drive;
  }

  async close(view) {
    try {
      await view.close();
    } catch (error) {
      console.log("error", error);
    }
  }
}
