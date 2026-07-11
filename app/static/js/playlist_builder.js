(function () {
    const dataElement = document.getElementById("playlist-builder-data");

    if (!dataElement) {
        return;
    }

    const builderData = JSON.parse(dataElement.textContent);
    const releases = builderData.releases || [];

    const oldestReleaseSelect = document.getElementById("oldest_release_number");
    const excludeLatestCheckbox = document.querySelector("[name='exclude_latest_release']");
    const mostRecentLimitSelect = document.getElementById("most_recent_limit");
    const excludedReleaseCheckboxes = document.querySelectorAll("[name='excluded_release_numbers']");

    const searchInput = document.getElementById("catalog_search");
    const searchCount = document.getElementById("search_count");
    const searchResults = document.getElementById("search_results");
    const replaceTracksModal = document.getElementById("replace_tracks_modal");
    const replaceAllTracksButton = document.getElementById("replace_all_tracks");
    const keepExistingTracksButton = document.getElementById("keep_existing_tracks");
    const fillAllRandomlyButton = document.getElementById("fill_all_randomly");

    const excludedReleasesMultiselect = document.getElementById("excluded_releases_multiselect");
    const excludedReleasesButton = document.getElementById("excluded_releases_dropdown_button");
    const excludedReleasesPanel = document.getElementById("excluded_releases_dropdown_panel");
    const excludedReleaseOptions = document.querySelectorAll("[data-release-code]");
    const excludedReleaseHiddenInputs = document.querySelectorAll("[data-release-hidden-input]");

    const includeBonusTracksCheckbox = document.getElementById("include_bonus_tracks");
    const includeAlternativeTracksCheckbox = document.getElementById("include_alternative_tracks");

    let pendingFillSelections = [];

    function getOldestReleaseNumber() {
        if (!oldestReleaseSelect || oldestReleaseSelect.value === "") {
            return null;
        }

        return Number(oldestReleaseSelect.value);
    }

    function getMostRecentLimit() {
        if (!mostRecentLimitSelect || mostRecentLimitSelect.value === "") {
            return null;
        }

        return Number(mostRecentLimitSelect.value);
    }

    function getExcludedReleaseNumbers() {
        return Array.from(excludedReleaseCheckboxes)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => Number(checkbox.value));
    }

    function getReleaseSortOrder(release) {
        return Number(release.sort_order ?? release.number ?? 0);
    }

    function sortOldestFirst(items) {
        return [...items].sort((a, b) => getReleaseSortOrder(a) - getReleaseSortOrder(b));
    }

    function sortNewestFirst(items) {
        return [...items].sort((a, b) => getReleaseSortOrder(b) - getReleaseSortOrder(a));
    }

    function getManuallyExcludedReleaseCodes() {
    return Array.from(excludedReleaseOptions)
        .filter((option) => option.getAttribute("aria-pressed") === "true")
        .map((option) => option.dataset.releaseCode);
}


    function setExcludedReleaseOptionState(option, isSelected) {
        const releaseCode = option.dataset.releaseCode;
        const hiddenInput = document.querySelector(
            `[data-release-hidden-input="${releaseCode}"]`
        );

        option.setAttribute("aria-pressed", isSelected ? "true" : "false");
        option.classList.toggle("is-selected", isSelected);

        if (hiddenInput) {
            hiddenInput.disabled = !isSelected;
        }
    }


    function toggleExcludedReleaseOption(option) {
        const isCurrentlySelected = option.getAttribute("aria-pressed") === "true";

        setExcludedReleaseOptionState(option, !isCurrentlySelected);
        updateExcludedReleasesSummary();
        updateCatalogSummary();
        renderSearchResults();
    }


    function openExcludedReleasesDropdown() {
        if (!excludedReleasesPanel || !excludedReleasesButton) {
            return;
        }

        excludedReleasesPanel.hidden = false;
        excludedReleasesButton.setAttribute("aria-expanded", "true");
    }


    function closeExcludedReleasesDropdown() {
        if (!excludedReleasesPanel || !excludedReleasesButton) {
            return;
        }

        excludedReleasesPanel.hidden = true;
        excludedReleasesButton.setAttribute("aria-expanded", "false");
    }


    function toggleExcludedReleasesDropdown() {
        if (!excludedReleasesPanel) {
            return;
        }

        if (excludedReleasesPanel.hidden) {
            openExcludedReleasesDropdown();
        } else {
            closeExcludedReleasesDropdown();
        }
    }


    function updateExcludedReleasesSummary() {
        const summary = document.getElementById("excluded_releases_summary");

        if (!summary) {
            return;
        }

        const selectedOptions = Array.from(excludedReleaseOptions)
            .filter((option) => option.getAttribute("aria-pressed") === "true");

        if (selectedOptions.length === 0) {
            summary.textContent = "No releases excluded";
            return;
        }

        if (selectedOptions.length === 1) {
            summary.textContent = selectedOptions[0].dataset.releaseLabel;
            return;
        }

        summary.textContent = `${selectedOptions.length} releases excluded`;
    }

    function getFilteredCatalogReleases() {
        let catalog = sortOldestFirst(releases);

        const oldestReleaseNumber = getOldestReleaseNumber();

        if (oldestReleaseNumber !== null) {
            catalog = catalog.filter((release) => getReleaseSortOrder(release) >= oldestReleaseNumber);
        }

        if (excludeLatestCheckbox && excludeLatestCheckbox.checked && catalog.length > 0) {
            const latestReleaseSortOrder = Math.max(
                ...catalog.map((release) => getReleaseSortOrder(release))
            );

            catalog = catalog.filter((release) => {
                return getReleaseSortOrder(release) !== latestReleaseSortOrder;
            });
        }

        const mostRecentLimit = getMostRecentLimit();

        if (mostRecentLimit !== null && mostRecentLimit > 0) {
            catalog = sortNewestFirst(catalog).slice(0, mostRecentLimit);
            catalog = sortOldestFirst(catalog);
        }

        const manuallyExcludedReleaseCodes = getManuallyExcludedReleaseCodes();

        if (manuallyExcludedReleaseCodes.length > 0) {
            catalog = catalog.filter((release) => {
                return !manuallyExcludedReleaseCodes.includes(String(release.code));
            });
        }

        return sortNewestFirst(catalog);
    }

    function getTrackGroupKey(track) {
        return track.groupKey || track.sourceCode || `${track.releaseCode}-${track.slot}-${track.title}`;
    }


    function mergeUniqueValues(values) {
        return Array.from(
            new Set(
                values
                    .filter(Boolean)
                    .map((value) => String(value).trim())
                    .filter(Boolean)
            )
        );
    }


    function buildTrackGroupsFromTracks(tracks) {
        const groupsByKey = new Map();

        tracks.forEach((track) => {
            const groupKey = getTrackGroupKey(track);

            if (!groupsByKey.has(groupKey)) {
                groupsByKey.set(groupKey, {
                    id: groupKey,
                    groupKey,
                    slot: track.slot,
                    slotName: track.slotName,
                    releaseNumber: track.releaseNumber,
                    releaseCode: track.releaseCode,
                    releaseTitle: track.releaseTitle,
                    variantType: track.variantType || "main",
                    genre: null,
                    difficulty: null,
                    tags: [],
                    tracks: [],
                });
            }

            const group = groupsByKey.get(groupKey);

            group.tracks.push(track);
            group.tags = mergeUniqueValues([
                ...group.tags,
                ...(track.tags || []),
            ]);
        });

        return Array.from(groupsByKey.values()).map((group) => {
            const sortedTracks = [...group.tracks].sort((a, b) => {
                return String(a.sourceTrackNumber).localeCompare(
                    String(b.sourceTrackNumber),
                    undefined,
                    { numeric: true }
                );
            });

            const genres = mergeUniqueValues(sortedTracks.map((track) => track.genre));
            const difficulties = mergeUniqueValues(sortedTracks.map((track) => track.difficulty));

            return {
                ...group,
                tracks: sortedTracks,
                title: sortedTracks.map((track) => track.title).join(" / "),
                artist: mergeUniqueValues(sortedTracks.map((track) => track.artist)).join(" / "),
                duration: sortedTracks
                    .map((track) => track.duration)
                    .filter(Boolean)
                    .join(" + "),
                genre: genres.join(", ") || null,
                difficulty: difficulties.join(", ") || null,
                sourceTrackNumber: sortedTracks
                    .map((track) => track.sourceTrackNumber)
                    .filter(Boolean)
                    .join(" + "),
            };
        });
    }

    function shouldIncludeTrackVariant(track) {
        const variantType = track.variantType || "main";

        if (variantType === "main") {
            return true;
        }

        if (variantType === "bonus") {
            return includeBonusTracksCheckbox?.checked === true;
        }

        if (variantType === "alternative") {
            return includeAlternativeTracksCheckbox?.checked === true;
        }

        return false;
    }

    function getTracksFromCatalog() {
        const catalog = getFilteredCatalogReleases();

        const tracks = catalog.flatMap((release) => {
            return (release.tracks || [])
                .map((track, index) => {
                    return {
                        id: `${release.code || release.display_number || release.number}-${track.slot}-${index}`,
                        sourceCode: track.source_code || null,
                        groupKey: track.group_key || null,
                        segment: track.segment || null,
                        variantType: track.variant_type || "main",
                        sourceTrackNumber: track.source_track_number || String(track.slot),
                        title: track.title,
                        artist: track.artist,
                        slot: track.slot,
                        slotName: track.slot_name,
                        releaseNumber: release.display_number || release.number || release.code,
                        releaseCode: release.code || String(release.number),
                        releaseTitle: release.title,
                        duration: track.duration || track.duration_seconds || null,
                        genre: track.genre || null,
                        tags: track.tags || [],
                        difficulty: track.difficulty || null,
                    };
                })
                .filter(shouldIncludeTrackVariant);
        });

        return buildTrackGroupsFromTracks(tracks);
    }

    function normaliseText(value) {
        return String(value || "").toLowerCase().trim();
    }

    function searchTracks(query) {
        const cleanQuery = normaliseText(query);

        if (cleanQuery.length < 2) {
            return [];
        }

        const tracks = getTracksFromCatalog();

        return tracks.filter((track) => {
            const searchableText = [
                track.title,
                track.artist,
                track.genre,
                track.difficulty,
                track.slotName,
                track.releaseNumber,
                track.releaseCode,
                ...(track.tags || []),
            ]
                .filter(Boolean)
                .map(normaliseText)
                .join(" ");

            return searchableText.includes(cleanQuery);
        });
    }

    function formatTrackMeta(track) {
        const parts = [`R${track.releaseNumber}`];

        if (track.variantType === "bonus") {
            parts.push("Bonus");
        }

        if (track.variantType === "alternative") {
            parts.push("Alternative");
        }

        if (track.duration) {
            parts.push(track.duration);
        }

        if (track.genre) {
            parts.push(track.genre);
        }

        if (track.difficulty) {
            parts.push(track.difficulty);
        }

        if (track.tags && track.tags.length > 0) {
            parts.push(track.tags.slice(0, 2).join(", "));
        }

        return parts.join(" · ");
    }

    function getSearchResultActionLabel(track) {
        return hasSelectedTrack(track.slot) ? "Replace" : "+ Add";
    }

    function renderSearchResults() {
        const query = searchInput.value;
        const results = searchTracks(query);

        searchResults.innerHTML = "";

        if (normaliseText(query).length < 2) {
            searchCount.textContent = "Start typing to search your catalog.";
            return;
        }

        searchCount.textContent =
            results.length === 1
                ? "1 track found"
                : `${results.length} tracks found`;

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-empty">
                    No tracks found in your selected catalog.
                </div>
            `;
            return;
        }

        results.slice(0, 30).forEach((track) => {
            const actionLabel = getSearchResultActionLabel(track);

            const resultElement = document.createElement("div");
            resultElement.className = "search-result-item";

            resultElement.innerHTML = `
                <div class="search-result-main">
                    <p class="search-result-title">"${escapeHtml(track.title)}"</p>
                    <p class="search-result-artist">${escapeHtml(track.artist)}</p>

                    <div class="search-result-meta">
                        <span class="slot-pill">${escapeHtml(track.slotName)}</span>
                        <span>${escapeHtml(formatTrackMeta(track))}</span>
                    </div>
                </div>

                <div class="search-result-action">
                    <button
                        class="mini-button mini-button-secondary"
                        type="button"
                        data-add-track-id="${escapeHtml(track.id)}"
                    >
                        ${escapeHtml(actionLabel)}
                    </button>
                </div>
            `;

            searchResults.appendChild(resultElement);
        });
    }

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function findTrackById(trackId) {
        return getTracksFromCatalog().find((track) => track.id === trackId) || null;
    }

    function addTrackToPlaylist(track) {
        const selectedTrackElement = document.querySelector(
            `[data-selected-track="${track.slot}"]`
        );

        if (!selectedTrackElement) {
            return;
        }

        const alreadyHasTrack = !selectedTrackElement.classList.contains("empty-track");

        if (alreadyHasTrack) {
            const shouldReplace = window.confirm(
                `This slot already has a track. Replace it with "${track.title}"?`
            );

            if (!shouldReplace) {
                return;
            }
        }

        selectedTrackElement.classList.remove("empty-track");
        selectedTrackElement.innerHTML = `
            <strong>${escapeHtml(track.title)}</strong>
            <span>${escapeHtml(track.artist)}</span>
            <small>${escapeHtml(track.releaseTitle)}</small>
        `;

        renderSearchResults();
    }

    function getSelectedThemeFilters() {
        return Array.from(document.querySelectorAll("[data-theme-filter].is-selected"))
            .map((button) => button.dataset.themeFilter);
    }


    function trackMatchesAnyFilter(track, filters) {
        const searchableValues = [
            track.genre,
            track.difficulty,
            ...(track.tags || []),
        ]
            .filter(Boolean)
            .map((value) => normaliseText(value));

        return filters.some((filter) => {
            const cleanFilter = normaliseText(filter);

            return searchableValues.includes(cleanFilter);
        });
    }


    function getRandomItem(items) {
        if (!items || items.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * items.length);

        return items[randomIndex];
    }


    function hasSelectedTrack(slotNumber) {
        const selectedTrackElement = document.querySelector(
            `[data-selected-track="${slotNumber}"]`
        );

        if (!selectedTrackElement) {
            return false;
        }

        return !selectedTrackElement.classList.contains("empty-track");
    }

    function setExcludedReleaseOptionState(option, isSelected) {
        const releaseCode = option.dataset.releaseCode;
        const hiddenInput = document.querySelector(
            `[data-release-hidden-input="${releaseCode}"]`
        );

        option.setAttribute("aria-pressed", isSelected ? "true" : "false");
        option.classList.toggle("is-selected", isSelected);

        if (hiddenInput) {
            hiddenInput.disabled = !isSelected;
        }
    }


    function toggleExcludedReleaseOption(option) {
        const isCurrentlySelected = option.getAttribute("aria-pressed") === "true";

        setExcludedReleaseOptionState(option, !isCurrentlySelected);
        updateExcludedReleasesSummary();
        updateCatalogSummary();
        renderSearchResults();
    }

    function openExcludedReleasesDropdown() {
        if (!excludedReleasesPanel || !excludedReleasesButton) {
            return;
        }

        excludedReleasesPanel.hidden = false;
        excludedReleasesButton.setAttribute("aria-expanded", "true");
    }


    function closeExcludedReleasesDropdown() {
        if (!excludedReleasesPanel || !excludedReleasesButton) {
            return;
        }

        excludedReleasesPanel.hidden = true;
        excludedReleasesButton.setAttribute("aria-expanded", "false");
    }


    function toggleExcludedReleasesDropdown() {
        if (!excludedReleasesPanel) {
            return;
        }

        if (excludedReleasesPanel.hidden) {
            openExcludedReleasesDropdown();
        } else {
            closeExcludedReleasesDropdown();
        }
    }

    function updateExcludedReleasesSummary() {
        const summary = document.getElementById("excluded_releases_summary");

        if (!summary) {
            return;
        }

        const selectedOptions = Array.from(excludedReleaseOptions)
            .filter((option) => option.getAttribute("aria-pressed") === "true");

        if (selectedOptions.length === 0) {
            summary.textContent = "No releases excluded";
            return;
        }

        if (selectedOptions.length === 1) {
            summary.textContent = selectedOptions[0].dataset.releaseLabel;
            return;
        }

        summary.textContent = `${selectedOptions.length} releases excluded`;
    }


    function getThemeFillSelections() {
        const selectedFilters = getSelectedThemeFilters();

        if (selectedFilters.length === 0) {
            return [];
        }

        const tracks = getTracksFromCatalog();
        const playlistSlotElements = document.querySelectorAll("[data-playlist-slot]");
        const selections = [];

        playlistSlotElements.forEach((slotElement) => {
            const slotNumber = Number(slotElement.dataset.playlistSlot);

            const candidates = tracks.filter((track) => {
                return (
                    track.slot === slotNumber &&
                    trackMatchesAnyFilter(track, selectedFilters)
                );
            });

            if (candidates.length === 0) {
                return;
            }

            const selectedTrack = getRandomItem(candidates);

            if (!selectedTrack) {
                return;
            }

            selections.push({
                slotNumber,
                track: selectedTrack,
                slotAlreadyHasTrack: hasSelectedTrack(slotNumber),
            });
        });

        return selections;
    }


    function fillPlaylistFromSelections(selections, replaceExistingTracks) {
        selections.forEach((selection) => {
            if (selection.slotAlreadyHasTrack && !replaceExistingTracks) {
                return;
            }

            addTrackToPlaylist(selection.track);
        });
    }


    function openReplaceTracksModal(selections) {
        pendingFillSelections = selections;

        if (!replaceTracksModal) {
            fillPlaylistFromSelections(selections, false);
            return;
        }

        replaceTracksModal.hidden = false;
    }


    function closeReplaceTracksModal() {
        if (replaceTracksModal) {
            replaceTracksModal.hidden = true;
        }

        pendingFillSelections = [];
    }


    function applyThemeAndFill() {
        const selectedFilters = getSelectedThemeFilters();

        if (selectedFilters.length === 0) {
            return;
        }

        const selections = getThemeFillSelections();

        if (selections.length === 0) {
            window.alert("No tracks found for the selected filters.");
            return;
        }

        const hasExistingTracksToReplace = selections.some((selection) => {
            return selection.slotAlreadyHasTrack;
        });

        if (hasExistingTracksToReplace) {
            openReplaceTracksModal(selections);
            return;
        }

        fillPlaylistFromSelections(selections, true);
    }


    function updateThemeFillButtonState() {
        const selectedFilters = getSelectedThemeFilters();
        const applyButton = document.getElementById("apply_theme_fill");
        const hint = document.getElementById("theme_filter_hint");

        if (!applyButton) {
            return;
        }

        const hasFilters = selectedFilters.length > 0;

        applyButton.disabled = !hasFilters;

        if (hint) {
            hint.textContent = hasFilters
                ? `${selectedFilters.length} filter${selectedFilters.length === 1 ? "" : "s"} selected`
                : "Select filters first";
        }
    }


    function toggleThemeFilter(button) {
        button.classList.toggle("is-selected");
        updateThemeFillButtonState();
    }

    function getRandomFillSelections() {
        const tracks = getTracksFromCatalog();
        const playlistSlotElements = document.querySelectorAll("[data-playlist-slot]");
        const selections = [];

        playlistSlotElements.forEach((slotElement) => {
            const slotNumber = Number(slotElement.dataset.playlistSlot);

            const candidates = tracks.filter((track) => {
                return track.slot === slotNumber;
            });

            if (candidates.length === 0) {
                return;
            }

            const selectedTrack = getRandomItem(candidates);

            if (!selectedTrack) {
                return;
            }

            selections.push({
                slotNumber,
                track: selectedTrack,
                slotAlreadyHasTrack: hasSelectedTrack(slotNumber),
            });
        });

        return selections;
    }

    function getManuallyExcludedReleaseCodes() {
        return Array.from(excludedReleaseOptions)
            .filter((option) => option.getAttribute("aria-pressed") === "true")
            .map((option) => option.dataset.releaseCode);
    }


    function fillAllRandomly() {
        const selections = getRandomFillSelections();

        if (selections.length === 0) {
            window.alert("No tracks found in your selected catalog.");
            return;
        }

        const hasExistingTracksToReplace = selections.some((selection) => {
            return selection.slotAlreadyHasTrack;
        });

        if (hasExistingTracksToReplace) {
            openReplaceTracksModal(selections);
            return;
        }

        fillPlaylistFromSelections(selections, true);
    }

    function bindEvents() {
        if (searchInput) {
            searchInput.addEventListener("input", renderSearchResults);
        }

        const catalogControls = [
            oldestReleaseSelect,
            excludeLatestCheckbox,
            mostRecentLimitSelect,
            ...excludedReleaseCheckboxes,
        ].filter(Boolean);

        catalogControls.forEach((control) => {
            control.addEventListener("change", renderSearchResults);
        });

        if (searchResults) {
            searchResults.addEventListener("click", (event) => {
                const button = event.target.closest("[data-add-track-id]");

                if (!button) {
                    return;
                }

                const trackId = button.dataset.addTrackId;
                const track = findTrackById(trackId);

                if (!track) {
                    return;
                }

                addTrackToPlaylist(track);
            });
        }

        if (fillAllRandomlyButton) {
            fillAllRandomlyButton.addEventListener("click", fillAllRandomly);
        }

        document.querySelectorAll("[data-theme-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                toggleThemeFilter(button);
            });
        });

        const applyThemeFillButton = document.getElementById("apply_theme_fill");

        if (applyThemeFillButton) {
            applyThemeFillButton.addEventListener("click", applyThemeAndFill);
        }

        if (replaceAllTracksButton) {
            replaceAllTracksButton.addEventListener("click", () => {
                fillPlaylistFromSelections(pendingFillSelections, true);
                closeReplaceTracksModal();
            });
        }

        if (keepExistingTracksButton) {
            keepExistingTracksButton.addEventListener("click", () => {
                fillPlaylistFromSelections(pendingFillSelections, false);
                closeReplaceTracksModal();
            });
        }

        if (replaceTracksModal) {
            replaceTracksModal.addEventListener("click", (event) => {
                if (event.target === replaceTracksModal) {
                    closeReplaceTracksModal();
                }
            });
        }

        if (excludedReleasesButton) {
            excludedReleasesButton.addEventListener("click", toggleExcludedReleasesDropdown);
        }

        excludedReleaseOptions.forEach((option) => {
            const isInitiallySelected = option.getAttribute("aria-pressed") === "true";

            setExcludedReleaseOptionState(option, isInitiallySelected);

            option.addEventListener("click", () => {
                toggleExcludedReleaseOption(option);
            });
        });

        document.addEventListener("click", (event) => {
            if (!excludedReleasesMultiselect) {
                return;
            }

            if (!excludedReleasesMultiselect.contains(event.target)) {
                closeExcludedReleasesDropdown();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeExcludedReleasesDropdown();
            }
        });

        if (includeBonusTracksCheckbox) {
            includeBonusTracksCheckbox.addEventListener("change", () => {
                updateCatalogSummary();
                renderSearchResults();
            });
        }

        if (includeAlternativeTracksCheckbox) {
            includeAlternativeTracksCheckbox.addEventListener("change", () => {
                updateCatalogSummary();
                renderSearchResults();
            });
        }

        updateExcludedReleasesSummary();
    }

    bindEvents();
})();