(function initFeedbackModal(globalScope) {
  const MODAL_ID = "dataSkillMapFeedbackModal";
  const TOAST_ID = "dataSkillMapFeedbackToast";
  const OPEN_CLASS = "feedback-modal-open";

  function getOrCreateModalRoot() {
    let overlay = document.getElementById(MODAL_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.className = "feedback-modal-overlay hidden";
    overlay.innerHTML = `
      <div class="feedback-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="feedbackModalTitle">
        <div class="feedback-modal-content" id="feedbackModalContent"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function getOrCreateToastRoot() {
    let toast = document.getElementById(TOAST_ID);
    if (toast) return toast;

    toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.className = "feedback-toast hidden";
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(title, text) {
    const toast = getOrCreateToastRoot();
    toast.innerHTML = `
      <strong>${title}</strong>
      <span>${text}</span>
    `;
    toast.classList.remove("hidden");
    toast.classList.add("visible");

    globalScope.setTimeout(() => {
      toast.classList.remove("visible");
      toast.classList.add("hidden");
    }, 2200);
  }

  function renderScaleItems() {
    const items = [
      { rating: 1, emoji: "😕" },
      { rating: 2, emoji: "🙁" },
      { rating: 3, emoji: "🙂" },
      { rating: 4, emoji: "😃" },
      { rating: 5, emoji: "🤩" }
    ];

    return items.map((item) => `
      <button
        type="button"
        class="feedback-rating-chip"
        data-feedback-rating="${item.rating}"
        aria-label="Nota ${item.rating}"
        aria-pressed="false"
      >
        <span class="feedback-rating-number">${item.rating}</span>
        <span class="feedback-rating-emoji" aria-hidden="true">${item.emoji}</span>
      </button>
    `).join("");
  }

  function renderModalTemplate(config) {
    return `
      <div class="feedback-modal-header">
        <div class="feedback-modal-title-wrap">
          <h3 id="feedbackModalTitle">${config.title}</h3>
          <p>${config.question}</p>
        </div>
        <button
          type="button"
          class="feedback-modal-close"
          id="feedbackModalClose"
          aria-label="Fechar pesquisa de satisfação"
        >
          ×
        </button>
      </div>
      <div class="feedback-modal-scale" role="radiogroup" aria-label="${config.scaleAriaLabel}">
        ${renderScaleItems()}
      </div>
      <div class="feedback-scale-hints" aria-hidden="true">
        <span class="hint-left">Ruim</span>
        <span class="hint-center">Ok</span>
        <span class="hint-right">Excelente</span>
      </div>
      <label class="feedback-modal-label" for="feedbackModalComment">${config.commentLabel}</label>
      <textarea
        id="feedbackModalComment"
        class="feedback-modal-textarea"
        maxlength="240"
        placeholder="${config.commentPlaceholder}"
      ></textarea>
      <div class="feedback-modal-actions">
        <button class="submit-button" id="feedbackModalSubmit" disabled>${config.submitLabel}</button>
        <button class="feedback-skip-button" id="feedbackModalSkip">${config.skipLabel}</button>
      </div>
      <div id="feedbackModalStatus"></div>
    `;
  }

  function closeModal(overlay) {
    overlay.classList.add("hidden");
    document.body.classList.remove(OPEN_CLASS);
    overlay.querySelector(".feedback-modal-content").innerHTML = "";
  }

  function openFeedbackModal(options) {
    const config = {
      title: "Pesquisa de satisfação",
      question: "Como foi sua experiência?",
      scaleAriaLabel: "Nota de satisfação",
      commentLabel: "Detalhe sua nota (opcional)",
      commentPlaceholder: "Compartilhe sua percepção da experiência.",
      submitLabel: "Enviar avaliação",
      skipLabel: "Agora não",
      successTitle: "Avaliação enviada.",
      successText: "Obrigado por ajudar a melhorar os desafios.",
      onSubmit: async () => ({ ok: false }),
      onSkip: null,
      ...options
    };

    const overlay = getOrCreateModalRoot();
    const sheet = overlay.querySelector(".feedback-modal-sheet");
    const content = overlay.querySelector(".feedback-modal-content");
    content.innerHTML = renderModalTemplate(config);

    const submitButton = content.querySelector("#feedbackModalSubmit");
    const skipButton = content.querySelector("#feedbackModalSkip");
    const closeButton = content.querySelector("#feedbackModalClose");
    const statusMount = content.querySelector("#feedbackModalStatus");
    const commentField = content.querySelector("#feedbackModalComment");
    const ratingButtons = content.querySelectorAll("[data-feedback-rating]");

    let selectedRating = null;
    let isSubmitting = false;

    function handleClose(triggerSkip = false) {
      if (triggerSkip && typeof config.onSkip === "function") {
        config.onSkip();
      }
      closeModal(overlay);
      document.removeEventListener("keydown", onEscapeKey);
      overlay.removeEventListener("click", onOverlayClick);
      sheet.removeEventListener("click", onSheetClick);
    }

    function onOverlayClick(event) {
      if (event.target === overlay) {
        handleClose(true);
      }
    }

    function onSheetClick(event) {
      event.stopPropagation();
    }

    function onEscapeKey(event) {
      if (event.key === "Escape") {
        handleClose(true);
      }
    }

    ratingButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (isSubmitting) return;

        selectedRating = Number(button.dataset.feedbackRating);
        ratingButtons.forEach((item) => {
          const isSelected = Number(item.dataset.feedbackRating) === selectedRating;
          item.classList.toggle("selected", isSelected);
          item.setAttribute("aria-pressed", isSelected ? "true" : "false");
        });
        submitButton.disabled = false;
      });
    });

    submitButton.addEventListener("click", async () => {
      if (!selectedRating || isSubmitting) return;

      isSubmitting = true;
      submitButton.disabled = true;
      skipButton.disabled = true;
      closeButton.disabled = true;

      const result = await config.onSubmit({
        rating: selectedRating,
        comment: commentField.value.trim() || null
      });

      if (result && result.ok) {
        handleClose(false);
        showToast(config.successTitle, config.successText);
        return;
      }

      statusMount.innerHTML = `
        <div class="feedback-box error">
          <strong>Não foi possível enviar agora.</strong>
          <p class="question-meta">Você pode tentar novamente em instantes.</p>
        </div>
      `;

      isSubmitting = false;
      submitButton.disabled = false;
      skipButton.disabled = false;
      closeButton.disabled = false;
    });

    skipButton.addEventListener("click", () => {
      handleClose(true);
    });

    closeButton.addEventListener("click", () => {
      handleClose(true);
    });

    overlay.addEventListener("click", onOverlayClick);
    sheet.addEventListener("click", onSheetClick);
    document.addEventListener("keydown", onEscapeKey);

    overlay.classList.remove("hidden");
    document.body.classList.add(OPEN_CLASS);

    const closeButtonFocusTarget = content.querySelector("#feedbackModalClose");
    if (closeButtonFocusTarget) closeButtonFocusTarget.focus();
  }

  globalScope.feedbackModal = {
    open: openFeedbackModal
  };
})(window);
