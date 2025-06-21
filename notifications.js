// Notification System - Handles all app notifications
class NotificationSystem {
  constructor() {
    this.notifications = [];
  }

  // Show a notification with custom content
  showNotification(options) {
    const {
      title,
      message,
      icon = "ℹ️",
      type = "info", // info, success, error, warning
      duration = 5000,
      actions = [],
      onClose = null,
    } = options;

    const container = document.createElement("div");
    container.className = `notification notification-${type}`;

    // Base styles
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #001601;
      border: 2px solid ${this.getBorderColor(type)};
      border-radius: 8px;
      padding: 1rem;
      color: #b0d944;
      font-family: monospace;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 400px;
      min-width: 300px;
    `;

    // Create content structure
    const content = document.createElement("div");
    content.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    `;

    const iconEl = document.createElement("div");
    iconEl.style.cssText = `
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    `;
    iconEl.textContent = icon;

    const textContainer = document.createElement("div");
    textContainer.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;

    const titleEl = document.createElement("div");
    titleEl.style.cssText = `
      font-size: 1rem;
      font-weight: bold;
      color: #b0d944;
    `;
    titleEl.textContent = title;

    const messageEl = document.createElement("div");
    messageEl.style.cssText = `
      font-size: 0.9rem;
      color: #888;
      line-height: 1.4;
    `;
    messageEl.textContent = message;

    textContainer.appendChild(titleEl);
    textContainer.appendChild(messageEl);

    // Add actions if provided
    if (actions.length > 0) {
      const actionsContainer = document.createElement("div");
      actionsContainer.style.cssText = `
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
        flex-wrap: wrap;
      `;

      actions.forEach((action) => {
        const actionBtn = document.createElement("button");
        actionBtn.textContent = action.label;
        actionBtn.style.cssText = `
          background: ${action.primary ? "#b0d944" : "transparent"};
          color: ${action.primary ? "#001601" : "#b0d944"};
          border: 1px solid #b0d944;
          padding: 0.5rem 1rem;
          font-family: monospace;
          font-size: 0.8rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.3s ease;
          white-space: nowrap;
        `;

        actionBtn.addEventListener("mouseenter", () => {
          actionBtn.style.background = action.primary ? "#d4f444" : "#b0d944";
          actionBtn.style.color = action.primary ? "#001601" : "#001601";
        });

        actionBtn.addEventListener("mouseleave", () => {
          actionBtn.style.background = action.primary
            ? "#b0d944"
            : "transparent";
          actionBtn.style.color = action.primary ? "#001601" : "#b0d944";
        });

        actionBtn.addEventListener("click", () => {
          if (action.onClick) action.onClick();
          this.removeNotification(container);
        });

        actionsContainer.appendChild(actionBtn);
      });

      textContainer.appendChild(actionsContainer);
    }

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
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
      margin-left: 0.5rem;
    `;

    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.background = "#b0d944";
      closeBtn.style.color = "#001601";
    });

    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.background = "transparent";
      closeBtn.style.color = "#b0d944";
    });

    closeBtn.addEventListener("click", () => {
      this.removeNotification(container);
      if (onClose) onClose();
    });

    // Assemble the notification
    content.appendChild(iconEl);
    content.appendChild(textContainer);
    content.appendChild(closeBtn);
    container.appendChild(content);

    // Add to DOM and animate in
    document.body.appendChild(container);
    this.notifications.push(container);

    setTimeout(() => {
      container.style.transform = "translateX(0)";
    }, 100);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(container);
      }, duration);
    }

    return container;
  }

  // Remove a specific notification
  removeNotification(container) {
    if (container.parentNode) {
      container.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
        const index = this.notifications.indexOf(container);
        if (index > -1) {
          this.notifications.splice(index, 1);
        }
      }, 300);
    }
  }

  // Remove all notifications
  removeAll() {
    this.notifications.forEach((notification) => {
      this.removeNotification(notification);
    });
  }

  // Get border color based on notification type
  getBorderColor(type) {
    switch (type) {
      case "success":
        return "#51cf66";
      case "error":
        return "#ff6b6b";
      case "warning":
        return "#ffd43b";
      case "info":
      default:
        return "#b0d944";
    }
  }

  // Convenience methods for common notification types
  showSuccess(title, message, options = {}) {
    return this.showNotification({
      title,
      message,
      icon: "✅",
      type: "success",
      ...options,
    });
  }

  showError(title, message, options = {}) {
    return this.showNotification({
      title,
      message,
      icon: "❌",
      type: "error",
      ...options,
    });
  }

  showWarning(title, message, options = {}) {
    return this.showNotification({
      title,
      message,
      icon: "⚠️",
      type: "warning",
      ...options,
    });
  }

  showInfo(title, message, options = {}) {
    return this.showNotification({
      title,
      message,
      icon: "ℹ️",
      type: "info",
      ...options,
    });
  }

  // Show writer joined notification
  showWriterJoined(writerId) {
    return this.showNotification({
      title: "New writer joined!",
      message: `Writer ${writerId}...`,
      icon: "👋",
      type: "success",
      duration: 5000,
    });
  }

  // Show join timeout notification
  showJoinTimeout() {
    return this.showNotification({
      title: "Join Timeout",
      message:
        "The join request timed out after 30 seconds. This could be due to network issues or the invite may be invalid.",
      icon: "⏰",
      type: "warning",
      duration: 0, // Don't auto-remove
      actions: [
        {
          label: "Try Again",
          primary: true,
          onClick: () => {
            // This will be handled by the caller
            document.dispatchEvent(new CustomEvent("retryJoin"));
          },
        },
        {
          label: "Back to Start",
          primary: false,
          onClick: () => {
            document.dispatchEvent(new CustomEvent("backToStart"));
          },
        },
      ],
    });
  }

  // Show join error notification
  showJoinError(errorMessage) {
    return this.showNotification({
      title: "Join Failed",
      message: `Failed to join the collaborative space: ${errorMessage}`,
      icon: "❌",
      type: "error",
      duration: 0, // Don't auto-remove
      actions: [
        {
          label: "Back to Start",
          primary: true,
          onClick: () => {
            document.dispatchEvent(new CustomEvent("backToStart"));
          },
        },
      ],
    });
  }
}

export { NotificationSystem };
