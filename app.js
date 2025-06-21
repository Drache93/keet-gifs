import { GifApp } from "./gif_app.js";
import { StartupUI } from "./startup-ui.js";
import { getOptions } from "./options.js";

const options = getOptions();
const key = options.key; // --key option
const dir = options.dir; // --dir option

console.log("key", key);
console.log("dir", dir);

// Initialize startup UI
const startupUI = new StartupUI();

// Handle startup events
document.addEventListener("startNewApp", async () => {
  console.log("Starting new app...");

  // Hide startup UI and show loader
  startupUI.hide();
  showLoader("Initializing new collaborative space...");

  // Initialize the application without an invite
  const app = new GifApp();
});

document.addEventListener("joinWithInvite", async (e) => {
  const invite = e.detail.invite;
  console.log("Joining with invite:", invite);

  // Hide startup UI and show loader
  startupUI.hide();
  showLoader("Joining collaborative space...");

  // Initialize the application with the invite
  const app = new GifApp(invite);
});

// If a key was provided via command line, skip startup UI
if (key) {
  console.log("Key provided via command line, skipping startup UI");

  // Hide startup UI and show loader
  startupUI.hide();
  showLoader("Initializing with provided key...");

  // Initialize the application with the provided key
  const app = new GifApp(key);
}

// Helper function to show loader with custom message
function showLoader(message = "Initializing...") {
  const loader = document.querySelector("#loader");
  const loaderText = document.querySelector(".loader-text");

  if (loader && loaderText) {
    loaderText.textContent = message;
    loader.classList.remove("hidden");
  }
}

// Listen for app ready event to hide loader and show main app
document.addEventListener("appReady", () => {
  const loader = document.querySelector("#loader");
  if (loader) {
    loader.classList.add("hidden");
  }
  document.getElementById("main-app").classList.add("active");
});
