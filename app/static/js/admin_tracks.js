(function () {
    const filtersForm = document.getElementById("admin_filters_form");
    const optionsDataElement = document.getElementById("admin-track-options-data");

    const addTrackModal = document.getElementById("add_track_modal");
    const openAddTrackModalButton = document.getElementById("open_add_track_modal");
    const closeAddTrackModalButton = document.getElementById("close_add_track_modal");
    const cancelAddTrackModalButton = document.getElementById("cancel_add_track_modal");

    const addReleaseModal = document.getElementById("add_release_modal");
    const openAddReleaseModalButton = document.getElementById("open_add_release_modal");
    const closeAddReleaseModalButton = document.getElementById("close_add_release_modal");
    const cancelAddReleaseModalButton = document.getElementById("cancel_add_release_modal");

    let optionsData = {
        genres: [],
        difficulties: [],
        tags: [],
    };

    if (optionsDataElement) {
        optionsData = JSON.parse(optionsDataElement.textContent);
    }

    function openAddTrackModal() {
        if (!addTrackModal) {
            return;
        }

        addTrackModal.hidden = false;
    }

    function closeAddTrackModal() {
        if (!addTrackModal) {
            return;
        }

        addTrackModal.hidden = true;
    }

    function normaliseText(value) {
        return String(value || "").trim().toLowerCase();
    }

    function splitValues(value) {
        return String(value || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function uniqueValues(values) {
        const seen = new Set();
        const result = [];

        values.forEach((value) => {
            const cleanValue = String(value || "").trim();

            if (!cleanValue) {
                return;
            }

            const key = normaliseText(cleanValue);

            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            result.push(cleanValue);
        });

        return result;
    }

    function getOptionsForType(type) {
        if (type === "genre") {
            return optionsData.genres || [];
        }

        if (type === "difficulty") {
            return optionsData.difficulties || [];
        }

        return optionsData.tags || [];
    }

    function setHiddenValue(editor, values) {
        const hiddenInput = editor.querySelector("[data-chip-hidden]");

        if (!hiddenInput) {
            return;
        }

        hiddenInput.value = uniqueValues(values).join(", ");
    }

    function getCurrentValues(editor) {
        const hiddenInput = editor.querySelector("[data-chip-hidden]");

        if (!hiddenInput) {
            return [];
        }

        return splitValues(hiddenInput.value);
    }

    function renderChips(editor) {
        const list = editor.querySelector("[data-chip-list]");
        const values = getCurrentValues(editor);

        if (!list) {
            return;
        }

        list.innerHTML = "";

        values.forEach((value) => {
            const chip = document.createElement("span");
            chip.className = "metadata-chip";

            const label = document.createElement("span");
            label.textContent = value;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "metadata-chip-remove";
            removeButton.textContent = "×";
            removeButton.setAttribute("aria-label", `Remove ${value}`);

            removeButton.addEventListener("click", () => {
                const nextValues = getCurrentValues(editor).filter((item) => {
                    return normaliseText(item) !== normaliseText(value);
                });

                setHiddenValue(editor, nextValues);
                renderChips(editor);
                renderSuggestions(editor);
            });

            chip.appendChild(label);
            chip.appendChild(removeButton);
            list.appendChild(chip);
        });
    }

    function addValue(editor, value) {
        const cleanValue = String(value || "").trim();

        if (!cleanValue) {
            return;
        }

        const isSingleValue = editor.dataset.singleValue === "true";
        const currentValues = getCurrentValues(editor);

        const nextValues = isSingleValue
            ? [cleanValue]
            : uniqueValues([...currentValues, cleanValue]);

        setHiddenValue(editor, nextValues);

        const input = editor.querySelector("[data-chip-input]");

        if (input) {
            input.value = "";
        }

        renderChips(editor);
        renderSuggestions(editor);
    }

    function renderSuggestions(editor) {
        const input = editor.querySelector("[data-chip-input]");
        const suggestions = editor.querySelector("[data-chip-suggestions]");

        if (!input || !suggestions) {
            return;
        }

        const type = editor.dataset.chipType;
        const query = normaliseText(input.value);
        const currentValues = getCurrentValues(editor).map(normaliseText);

        const options = getOptionsForType(type).filter((option) => {
            const cleanOption = normaliseText(option);

            if (currentValues.includes(cleanOption)) {
                return false;
            }

            if (!query) {
                return true;
            }

            return cleanOption.includes(query);
        });

        suggestions.innerHTML = "";

        if (options.length === 0) {
            suggestions.hidden = true;
            return;
        }

        options.slice(0, 12).forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "chip-suggestion";
            button.textContent = option;

            button.addEventListener("mousedown", (event) => {
                event.preventDefault();
                addValue(editor, option);
            });

            suggestions.appendChild(button);
        });

        suggestions.hidden = false;
    }

    function closeAllSuggestions() {
        document.querySelectorAll("[data-chip-suggestions]").forEach((element) => {
            element.hidden = true;
        });
    }

    function setupChipEditor(editor) {
        const input = editor.querySelector("[data-chip-input]");

        renderChips(editor);

        if (!input) {
            return;
        }

        input.addEventListener("input", () => {
            renderSuggestions(editor);
        });

        input.addEventListener("focus", () => {
            renderSuggestions(editor);
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();

                addValue(editor, input.value);
                closeAllSuggestions();
            }

            if (event.key === "Escape") {
                closeAllSuggestions();
            }

            if (event.key === "Backspace" && input.value === "") {
                const values = getCurrentValues(editor);

                if (values.length === 0) {
                    return;
                }

                values.pop();
                setHiddenValue(editor, values);
                renderChips(editor);
                renderSuggestions(editor);
            }
        });
    }

    function openAddReleaseModal() {
        if (!addReleaseModal) {
            return;
        }

        addReleaseModal.hidden = false;
    }

    function closeAddReleaseModal() {
        if (!addReleaseModal) {
            return;
        }

        addReleaseModal.hidden = true;
    }

    function setupAutoFilters() {
        if (!filtersForm) {
            return;
        }

        let searchTimeout = null;

        filtersForm.querySelectorAll("select").forEach((select) => {
            select.addEventListener("change", () => {
                filtersForm.submit();
            });
        });

        const searchInput = filtersForm.querySelector('input[name="search"]');

        if (searchInput) {
            searchInput.addEventListener("input", () => {
                clearTimeout(searchTimeout);

                searchTimeout = setTimeout(() => {
                    filtersForm.submit();
                }, 450);
            });
        }
    }

    document.querySelectorAll("[data-chip-editor]").forEach(setupChipEditor);

    document.addEventListener("click", (event) => {
        if (!event.target.closest("[data-chip-editor]")) {
            closeAllSuggestions();
        }
    });

    if (openAddTrackModalButton) {
        openAddTrackModalButton.addEventListener("click", openAddTrackModal);
    }

    if (closeAddTrackModalButton) {
        closeAddTrackModalButton.addEventListener("click", closeAddTrackModal);
    }

    if (cancelAddTrackModalButton) {
        cancelAddTrackModalButton.addEventListener("click", closeAddTrackModal);
    }

    if (addTrackModal) {
        addTrackModal.addEventListener("click", (event) => {
            if (event.target === addTrackModal) {
                closeAddTrackModal();
            }
        });
    }

    if (openAddReleaseModalButton) {
        openAddReleaseModalButton.addEventListener("click", openAddReleaseModal);
    }

    if (closeAddReleaseModalButton) {
        closeAddReleaseModalButton.addEventListener("click", closeAddReleaseModal);
    }

    if (cancelAddReleaseModalButton) {
        cancelAddReleaseModalButton.addEventListener("click", closeAddReleaseModal);
    }

    if (addReleaseModal) {
        addReleaseModal.addEventListener("click", (event) => {
            if (event.target === addReleaseModal) {
                closeAddReleaseModal();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAddTrackModal();
            closeAddReleaseModal();
        }
    });

    setupAutoFilters();
})();