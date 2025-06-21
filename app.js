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
let app;

// Handle startup events
document.addEventListener("startNewApp", async () => {
  console.log("Starting new app...");

  // Hide startup UI and show loader
  startupUI.hide();
  showLoader("Initializing new collaborative space...");

  // Initialize the application without an invite
  app = new GifApp();
});

document.addEventListener("joinWithInvite", async (e) => {
  const invite = e.detail.invite;
  console.log("Joining with invite:", invite);

  // Hide startup UI and show loader
  startupUI.hide();
  showLoader("Joining collaborative space...");

  // Initialize the application with the invite
  app = new GifApp(invite);
});

// If a key was provided via command line, skip startup UI
if (key) {
  console.log("Key provided via command line, skipping startup UI");

  // Hide startup UI and show loader
  startupUI.hide();
  showLoader("Initializing with provided key...");

  // Initialize the application with the provided key
  app = new GifApp(key);
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

// Listen for successful join event to show restart message
document.addEventListener("joinSuccess", () => {
  console.log("Join successful, showing restart message...");

  // Hide main app and show restart message
  document.getElementById("main-app").classList.remove("active");
  showRestartMessage();
});

// Show restart message after successful join
function showRestartMessage() {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #001601;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const content = document.createElement("div");
  content.style.cssText = `
    text-align: center;
    color: #b0d944;
    font-family: monospace;
    max-width: 500px;
    padding: 2rem;
  `;

  content.innerHTML = `
    <div style="font-size: 4rem; margin-bottom: 2rem;">🎉</div>
    <h1 style="font-size: 2rem; margin-bottom: 1rem;">Successfully Joined!</h1>
    <p style="font-size: 1.1rem; margin-bottom: 2rem; color: #888; line-height: 1.5;">
      You have successfully joined the collaborative space. 
      Please close this app and restart it to continue.
    </p>
    <button id="continue-btn" style="
      background: #b0d944;
      color: #001601;
      border: none;
      padding: 1rem 2rem;
      font-family: monospace;
      font-size: 1rem;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.3s ease;
    ">Continue</button>
  `;

  const continueBtn = content.querySelector("#continue-btn");
  continueBtn.addEventListener("mouseenter", () => {
    continueBtn.style.background = "#d4f444";
  });
  continueBtn.addEventListener("mouseleave", () => {
    continueBtn.style.background = "#b0d944";
  });
  continueBtn.addEventListener("click", () => {
    // Close the app
    window.close();
  });

  container.appendChild(content);
  document.body.appendChild(container);
}
