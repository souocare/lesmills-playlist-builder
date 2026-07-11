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

        const excludedReleaseNumbers = getExcludedReleaseNumbers();

        if (excludedReleaseNumbers.length > 0) {
            catalog = catalog.filter(
                (release) => !excludedReleaseNumbers.includes(release.number)
            );
        }

        return catalog;
    }

    function getTracksFromCatalog() {
        const catalog = getFilteredCatalogReleases();

        return catalog.flatMap((release) => {
            return (release.tracks || []).map((track, index) => {
                return {
                    id: `${release.code || release.display_number || release.number}-${track.slot}-${index}`,
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
            });
        });
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
        const parts = [`Release: ${track.releaseNumber}`];

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
    }

    bindEvents();
})();