// Utility functions for the GIF app

export class FileUtils {
  // File type validation
  static isValidFileType(file) {
    return file.type.match(/^(image\/gif|image\/webp)$/);
  }

  // Generate unique filename with timestamp
  static generateFilename(originalName) {
    const timestamp = Date.now();
    const extension = originalName.split(".").pop();
    return `gif_${timestamp}.${extension}`;
  }

  // Get file extension from filename
  static getFileExtension(filename) {
    return filename.split(".").pop().toLowerCase();
  }

  // Check if file is an image file
  static isImageFile(filename) {
    const extension = this.getFileExtension(filename);
    return ["gif", "webp"].includes(extension);
  }
}

export class ValidationUtils {
  // Validate file for upload
  static validateUploadFile(file) {
    if (!file) {
      return { valid: false, message: "Please select a file first" };
    }

    if (!FileUtils.isValidFileType(file)) {
      return {
        valid: false,
        message: "Please select a valid GIF or WebP file",
      };
    }

    return { valid: true };
  }
}

export class DateUtils {
  // Format timestamp for display
  static formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  // Get current timestamp
  static getCurrentTimestamp() {
    return Date.now();
  }
}
