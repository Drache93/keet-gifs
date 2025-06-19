# Keet GIFs App

A decentralized GIF and WebP sharing application built with Hyperdrive and Pear.

## Project Structure

The application has been refactored to follow a clean separation of concerns:

### Core Files

- **`app.js`** - Main application entry point

  - Handles Hyperdrive initialization and business logic
  - Manages file uploads and gallery data
  - Coordinates between UI and data layer

- **`ui.js`** - User Interface module

  - Handles all DOM manipulation and event listeners
  - Manages form interactions, drag & drop, and gallery display
  - Communicates with main app via custom events

- **`utils.js`** - Utility functions
  - File validation and type checking
  - Filename generation and extension handling
  - Date formatting utilities

### Key Improvements

1. **Reduced Duplication**:

   - File validation logic centralized in `ValidationUtils`
   - Filename generation moved to `FileUtils`
   - Common DOM queries cached in UI class

2. **Separation of Concerns**:

   - UI logic separated from business logic
   - Hyperdrive operations isolated in main app class
   - Utility functions reusable across modules

3. **Better Maintainability**:
   - Clear module boundaries
   - Consistent error handling
   - Event-driven communication between modules

## Architecture

```
app.js (Main App)
├── Hyperdrive setup & management
├── File upload handling
├── Gallery data management
└── Event coordination

ui.js (UI Module)
├── DOM manipulation
├── Event listeners
├── Form handling
└── Gallery display

utils.js (Utilities)
├── File validation
├── Filename generation
└── Helper functions
```

## Usage

The application allows users to:

- Upload GIF and WebP files via drag & drop or file picker
- View uploaded files in a gallery
- Click on images to view full size
- Switch between upload and gallery tabs

## Development

To run the application:

```bash
npm start
```

The app uses Pear's decentralized infrastructure for peer-to-peer file sharing.
