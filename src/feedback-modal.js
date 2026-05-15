(function initFeedbackModal(globalScope) {
  const MODAL_ID = "dataSkillMapFeedbackModal";
  const OPEN_CLASS = "feedback-modal-open";

  function getOrCreateModalRoot() {
    let overlay = document.getElementById(MODAL_ID);
    if (overlay) {
      return overlay;
    }

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

  function closeModal(overlay) {
    overlay.classList.add("hidden");
    document.body.classList.remove(OPEN_CLASS);
    overlay.querySelector(".feedback-modal-content").innerHTML = "";
  }

  function renderModalTemplate(config) {
    return `
      <div class="feedback-modal-header">
        <h3 id="feedbackModalTitle">${config.title}</h3>
        <p>${config.question}</p>
      </div>
      <div class="feedback-modal-scale" role="radiogroup" aria-label="${config.scaleAriaLabel}">
        ${[1, 2, 3, 4, 5].map((rating) => `
          <button type="button" class="feedback-rating-chip" data-feedback-rating="${rating}" aria-label="Nota ${rating}">
            <span>${rating}</span>
          </button>
        `).join("")}
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

  function showSuccessState(content, config) {
    content.innerHTML = `
      <div class="feedback-modal-header feedback-modal-header-success">
        <h3>${config.successTitle}</h3>
        <p>${config.successText}</p>
      </div>
    `;
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
    const content = overlay.querySelector(".feedback-modal-content");
    content.innerHTML = renderModalTemplate(config);

    const sheet = overlay.querySelector(".feedback-modal-sheet");
    const submitButton = content.querySelector("#feedbackModalSubmit");
    const skipButton = content.querySelector("#feedbackModalSkip");
    const statusMount = content.querySelector("#feedbackModalStatus");
    const commentField = content.querySelector("#feedbackModalComment");
    const ratingButtons = content.querySelectorAll("[data-feedback-rating]");

    let selectedRating = null;
    let isSubmitting = false;

    function handleClose() {
      closeModal(overlay);
      document.removeEventListener("keydown", onEscapeKey);
      overlay.removeEventListener("click", onOverlayClick);
      sheet.removeEventListener("click", onSheetClick);
    }

    function onEscapeKey(event) {
      if (event.key === "Escape") {
        if (typeof config.onSkip === "function") {
          config.onSkip();
        }
        handleClose();
      }
    }

    ratingButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (isSubmitting) return;
        selectedRating = Number(button.dataset.feedbackRating);
        ratingButtons.forEach((item) => {
          item.classList.toggle("selected", Number(item.dataset.feedbackRating) === selectedRating);
        });
        submitButton.disabled = false;
      });
    });

    submitButton.addEventListener("click", async () => {
      if (!selectedRating || isSubmitting) return;

      isSubmitting = true;
      submitButton.disabled = true;
      skipButton.disabled = true;

      const result = await config.onSubmit({
        rating: selectedRating,
        comment: commentField.value.trim() || null
      });

      if (result && result.ok) {
        showSuccessState(content, config);
        setTimeout(() => {
          handleClose();
        }, 1200);
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
    });

    skipButton.addEventListener("click", () => {
      if (typeof config.onSkip === "function") {
        config.onSkip();
      }
      handleClose();
    });

    overlay.addEventListener("click", onOverlayClick);
    sheet.addEventListener("click", onSheetClick);

    overlay.classList.remove("hidden");
    document.body.classList.add(OPEN_CLASS);
    document.addEventListener("keydown", onEscapeKey);

    const firstButton = content.querySelector("[data-feedback-rating]");
    if (firstButton) {
      firstButton.focus();
    }
  }

  globalScope.feedbackModal = {
    open: openFeedbackModal
  };
})(window);
    function onOverlayClick(event) {
      if (event.target === overlay) {
        if (typeof config.onSkip === "function") {
          config.onSkip();
        }
        handleClose();
      }
    }

    function onSheetClick(event) {
      event.stopPropagation();
    }
