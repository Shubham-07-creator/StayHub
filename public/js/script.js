// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

// ============================================
// DARK / LIGHT THEME UI SYNC
// ============================================
(() => {
  const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark" ||
                 localStorage.getItem("stayhub_theme") === "dark";
  if (typeof updateThemeIcon === "function") {
    updateThemeIcon(isDark);
  }
})();

// ============================================
// GLOBAL CONFIRM MODAL SYSTEM
// ============================================
let pendingConfirmCallback = null;

window.showConfirmModal = function({
  title = "Are you sure?",
  message = "Do you want to proceed with this action?",
  confirmText = "Yes, Proceed",
  cancelText = "Cancel",
  type = "danger", // 'danger' | 'warning' | 'primary'
  icon = "fa-triangle-exclamation",
  onConfirm
} = {}) {
  const modalEl = document.getElementById("globalConfirmModal");
  if (!modalEl || typeof bootstrap === "undefined") {
    if (confirm(message)) {
      if (typeof onConfirm === "function") onConfirm();
    }
    return;
  }

  const titleEl = document.getElementById("confirmModalTitle");
  const msgEl = document.getElementById("confirmModalMessage");
  const proceedBtn = document.getElementById("confirmModalProceedBtn");
  const cancelBtn = document.getElementById("confirmModalCancelBtn");
  const iconEl = document.getElementById("confirmModalIcon");
  const iconWrapper = document.getElementById("confirmModalIconWrapper");

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = message;
  if (cancelBtn) cancelBtn.textContent = cancelText;

  if (proceedBtn) {
    const btnText = proceedBtn.querySelector(".btn-text");
    if (btnText) btnText.textContent = confirmText;

    // Reset base classes
    proceedBtn.className = "btn rounded-pill px-4 py-2 fw-semibold flex-fill confirm-btn-proceed d-flex align-items-center justify-content-center gap-2";
    if (type === "danger") {
      proceedBtn.classList.add("btn-danger");
    } else if (type === "warning") {
      proceedBtn.classList.add("btn-warning", "text-dark");
    } else {
      proceedBtn.classList.add("btn-brand");
    }

    const spinner = proceedBtn.querySelector(".btn-spinner");
    if (spinner) spinner.classList.add("d-none");
    proceedBtn.disabled = false;
  }

  if (iconEl) {
    iconEl.className = `fa-solid ${icon}`;
  }
  if (iconWrapper) {
    iconWrapper.className = `confirm-icon-wrapper mb-3 confirm-type-${type}`;
  }

  pendingConfirmCallback = onConfirm;

  const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
  bsModal.show();
};

document.addEventListener("DOMContentLoaded", () => {
  // Confirm Proceed button click handler
  const proceedBtn = document.getElementById("confirmModalProceedBtn");
  const modalEl = document.getElementById("globalConfirmModal");

  if (proceedBtn) {
    proceedBtn.addEventListener("click", () => {
      const spinner = proceedBtn.querySelector(".btn-spinner");
      if (spinner) spinner.classList.remove("d-none");
      proceedBtn.disabled = true;

      const cb = pendingConfirmCallback;
      pendingConfirmCallback = null;

      if (modalEl && typeof bootstrap !== "undefined") {
        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();
      }

      if (typeof cb === "function") {
        cb();
      }
    });
  }

  // Intercept all forms with data-confirm
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form || !form.hasAttribute || !form.hasAttribute("data-confirm")) return;

    if (form.dataset.confirmed === "true") {
      delete form.dataset.confirmed;
      return; // allow normal submission
    }

    e.preventDefault();
    e.stopPropagation();

    const message = form.getAttribute("data-confirm") || "Are you sure you want to proceed?";
    const title = form.getAttribute("data-confirm-title") || "Confirm Action";
    const confirmText = form.getAttribute("data-confirm-btn") || "Yes, Proceed";
    const cancelText = form.getAttribute("data-confirm-cancel") || "Cancel";
    const type = form.getAttribute("data-confirm-type") || "danger";
    const icon = form.getAttribute("data-confirm-icon") || (type === "danger" ? "fa-trash-can" : "fa-triangle-exclamation");

    window.showConfirmModal({
      title,
      message,
      confirmText,
      cancelText,
      type,
      icon,
      onConfirm: () => {
        form.dataset.confirmed = "true";
        form.submit();
      }
    });
  });

  // Auto-dismiss Flash Alerts with countdown progress
  const flashAlerts = document.querySelectorAll(".stayhub-flash");
  flashAlerts.forEach((alert) => {
    const timeout = parseInt(alert.getAttribute("data-auto-dismiss") || "4500", 10);
    let dismissTimer = null;

    const startTimer = () => {
      dismissTimer = setTimeout(() => {
        alert.classList.add("stayhub-flash-fade-out");
        setTimeout(() => {
          const wrap = alert.closest(".stayhub-flash-wrap");
          if (wrap) wrap.remove();
          else alert.remove();
        }, 400);
      }, timeout);
    };

    const stopTimer = () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };

    startTimer();

    alert.addEventListener("mouseenter", stopTimer);
    alert.addEventListener("mouseleave", startTimer);
  });
});


