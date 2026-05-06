(() => {
  const setsNode = document.getElementById("sets-json");
  const bannedCardsNode = document.getElementById("banned-cards-json");
  const setFilter = document.getElementById("set-filter");
  const searchInput = document.getElementById("card-search");
  const hideBannedCardsToggle = document.getElementById("hide-banned-cards");
  const catalogGrid = document.getElementById("catalog-grid");
  const deckInput = document.getElementById("deck-input");
  const deckIssues = document.getElementById("deck-issues");
  const deckSummary = document.getElementById("deck-summary");
  const deckStatus = document.getElementById("deck-status");
  const deckExportSet = document.getElementById("deck-export-set");
  const deckExportName = document.getElementById("deck-export-name");
  const deckLibraryOpen = document.getElementById("deck-library-open");
  const deckLibraryModal = document.getElementById("deck-library-modal");
  const deckLibraryClose = document.getElementById("deck-library-close");
  const deckLibraryList = document.getElementById("deck-library-list");
  const deckCopyExport = document.getElementById("deck-copy-export");
  const deckNew = document.getElementById("deck-new");
  const deckNameSection = document.getElementById("deck-name-section");
  const deckImportOpen = document.getElementById("deck-import-open");
  const deckImportModal = document.getElementById("deck-import-modal");
  const deckImportClose = document.getElementById("deck-import-close");
  const deckImportCancel = document.getElementById("deck-import-cancel");
  const deckImportRun = document.getElementById("deck-import-run");
  const deckImportInput = document.getElementById("deck-import-input");
  const deckImportAllowPromos = document.getElementById("deck-import-allow-promos");
  const deckImportStatus = document.getElementById("deck-import-status");
  const deckTypeGroups = document.getElementById("deck-type-groups");
  const deckCardModal = document.getElementById("deck-card-modal");
  const deckCardModalImage = document.getElementById("deck-card-modal-image");
  const deckCardModalTitle = document.getElementById("deck-card-modal-title");
  const deckCardModalSubtitle = document.getElementById("deck-card-modal-subtitle");
  const deckCardModalType = document.getElementById("deck-card-modal-type");
  const deckCardModalRarity = document.getElementById("deck-card-modal-rarity");
  const deckCardModalText = document.getElementById("deck-card-modal-text");
  const deckCardModalClose = document.getElementById("deck-card-modal-close");
  const deckCardModalCloseBottom = document.getElementById("deck-card-modal-close-bottom");

  if (!setsNode || !bannedCardsNode || !setFilter || !searchInput || !hideBannedCardsToggle || !catalogGrid || !deckInput || !deckIssues || !deckSummary || !deckStatus || !deckExportSet || !deckExportName || !deckLibraryOpen || !deckLibraryModal || !deckLibraryClose || !deckLibraryList || !deckNew || !deckCopyExport || !deckNameSection || !deckImportOpen || !deckImportModal || !deckImportClose || !deckImportCancel || !deckImportRun || !deckImportInput || !deckImportAllowPromos || !deckImportStatus || !deckTypeGroups || !deckCardModal || !deckCardModalImage || !deckCardModalTitle || !deckCardModalSubtitle || !deckCardModalType || !deckCardModalRarity || !deckCardModalText || !deckCardModalClose || !deckCardModalCloseBottom) {
    return;
  }

  const legacyStorageKey = "super-benji-deck-builder-v1";
  const deckLibraryKey = "super-benji-deck-builder-library-v1";
  const sets = JSON.parse(setsNode.textContent || "[]");
  const bannedCardNames = new Set((JSON.parse(bannedCardsNode.textContent || "[]") || []).map((item) => normalizeText(item.name || item)));
  let activeDeckName = "";
  const cardCache = new Map();
  const cardIndex = new Map();
  const cardsByName = new Map();
  let selectedDeckCardId = "";

  function cardCode(index, padding) {
    return String(index).padStart(padding, "0");
  }

  function normalizeText(value) {
    return (value || "").toLowerCase().trim();
  }

  function normalizeDeckName(value) {
    return String(value || "").trim();
  }

  function isBannedCard(card) {
    return bannedCardNames.has(normalizeText(card.cardName));
  }

  function getDeckLibrary() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(deckLibraryKey) || "{}");
      const decks = parsed && typeof parsed.decks === "object" && parsed.decks !== null ? parsed.decks : {};
      const selected = typeof parsed.selected === "string" ? parsed.selected : "";
      return { decks, selected };
    } catch (error) {
      return { decks: {}, selected: "" };
    }
  }

  function saveDeckLibrary(library) {
    window.localStorage.setItem(deckLibraryKey, JSON.stringify(library));
  }

  function renderDeckLibraryList() {
    const library = getDeckLibrary();
    const names = Object.keys(library.decks).sort((left, right) => left.localeCompare(right));

    deckLibraryList.innerHTML = "";
    if (names.length === 0) {
      const empty = document.createElement("div");
      empty.className = "deck-library-modal__empty";
      empty.textContent = "No saved decks. Use 'New Deck' to create one.";
      deckLibraryList.appendChild(empty);
      return;
    }

    names.forEach((name) => {
      const item = document.createElement("div");
      item.className = "deck-library-modal__item";
      
      const link = document.createElement("button");
      link.type = "button";
      link.className = "deck-library-modal__item-name";
      link.textContent = name;
      link.addEventListener("click", () => loadDeckByName(name));
      
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "deck-library-modal__delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteDeckByName(name);
      });
      
      item.appendChild(link);
      item.appendChild(deleteBtn);
      deckLibraryList.appendChild(item);
    });
  }

  function renderDeckNameSection() {
    deckNameSection.innerHTML = "";
    
    if (!activeDeckName) {
      return;
    }

    const section = document.createElement("div");
    section.className = "deck-builder__deck-name-section";
    
    const label = document.createElement("span");
    label.className = "deck-builder__deck-name-label";
    label.textContent = "Deck:";
    
    const display = document.createElement("span");
    display.className = "deck-builder__deck-name-display";
    display.textContent = activeDeckName;
    
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "deck-builder__deck-name-edit-btn";
    editBtn.textContent = "Rename";
    editBtn.addEventListener("click", () => startEditingDeckName(section, editBtn));
    
    section.appendChild(label);
    section.appendChild(display);
    section.appendChild(editBtn);
    deckNameSection.appendChild(section);
  }

  function startEditingDeckName(section, editBtn) {
    const display = section.querySelector(".deck-builder__deck-name-display");
    const currentName = display.textContent;
    
    const input = document.createElement("input");
    input.type = "text";
    input.className = "deck-builder__deck-name-input";
    input.value = currentName;
    input.maxLength = 100;
    
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "deck-builder__deck-name-edit-btn";
    saveBtn.textContent = "Save";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "deck-builder__deck-name-edit-btn";
    cancelBtn.textContent = "Cancel";
    
    const handleSave = () => {
      const newName = normalizeDeckName(input.value);
      if (!newName) {
        deckStatus.innerHTML = '<p class="deck-builder__status--illegal">Deck name cannot be empty.</p>';
        input.focus();
        return;
      }
      
      if (newName === currentName) {
        cancelEdit();
        return;
      }
      
      renameDeck(currentName, newName);
    };
    
    const cancelEdit = () => {
      renderDeckNameSection();
    };
    
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    });
    
    saveBtn.addEventListener("click", handleSave);
    cancelBtn.addEventListener("click", cancelEdit);
    
    section.replaceChild(input, display);
    editBtn.remove();
    section.appendChild(saveBtn);
    section.appendChild(cancelBtn);
    
    input.focus();
    input.select();
  }

  function renameDeck(oldName, newName) {
    const library = getDeckLibrary();
    
    if (!library.decks[oldName] && library.decks[oldName] !== "") {
      deckStatus.innerHTML = '<p class="deck-builder__status--illegal">Deck not found.</p>';
      return;
    }
    
    if (library.decks[newName] && newName !== oldName) {
      deckStatus.innerHTML = '<p class="deck-builder__status--illegal">A deck with that name already exists.</p>';
      return;
    }
    
    library.decks[newName] = library.decks[oldName];
    delete library.decks[oldName];
    
    if (library.selected === oldName) {
      library.selected = newName;
    }
    
    activeDeckName = newName;
    saveDeckLibrary(library);
    renderDeckLibraryList();
    renderDeckNameSection();
    
    deckStatus.innerHTML = '<p class="deck-builder__status--legal">Renamed deck to ' + newName + '.</p>';
  }

  function openDeckLibraryModal() {
    renderDeckLibraryList();
    deckLibraryModal.classList.add("is-open");
    deckLibraryModal.setAttribute("aria-hidden", "false");
  }

  function closeDeckLibraryModal() {
    deckLibraryModal.classList.remove("is-open");
    deckLibraryModal.setAttribute("aria-hidden", "true");
  }

  function migrateLegacyDeck() {
    const legacy = window.localStorage.getItem(legacyStorageKey);
    if (!legacy) {
      return;
    }

    const library = getDeckLibrary();
    if (!library.decks["My Deck"]) {
      library.decks["My Deck"] = legacy;
      library.selected = library.selected || "My Deck";
      saveDeckLibrary(library);
    }

    window.localStorage.removeItem(legacyStorageKey);
  }

  function normalizeCardNumber(value) {
    const trimmed = String(value || "").trim();
    return /^\d+$/.test(trimmed) ? String(Number.parseInt(trimmed, 10)) : trimmed;
  }

  function normalizeCardIdentifier(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/\/(\d+)$/, (_, digits) => `/${normalizeCardNumber(digits)}`);
  }

  function isPromoCard(card) {
    return !/^\d+$/.test(String(card.cardNumber || "").trim());
  }

  function comparePrintings(left, right) {
    if (left.setOrder !== right.setOrder) {
      return right.setOrder - left.setOrder;
    }

    if (left.rowOrder !== right.rowOrder) {
      return right.rowOrder - left.rowOrder;
    }

    return right.cardNumber.localeCompare(left.cardNumber, undefined, { numeric: true, sensitivity: "base" });
  }

  function parseTsv(text, setMeta, setOrder) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split("\t").map((part) => part.trim().toLowerCase());

    return lines.slice(1).map((line, rowIndex) => {
      const columns = line.split("\t");
      const row = {};
      headers.forEach((header, index) => {
        row[header] = (columns[index] || "").trim();
      });

      const imageCode = cardCode(rowIndex, 2);
      const cardNumber = row["card number"] || "";
      const numericCardNumber = Number.parseInt(cardNumber, 10);
      const displayNumber = Number.isNaN(numericCardNumber) ? cardNumber : String(numericCardNumber);
      const setCode = row["set name"] || setMeta.code || setMeta.name;
      const cardName = row.cardname || `Card ${rowIndex + 1}`;

      return {
        code: imageCode,
        setId: setMeta.id,
        setName: setMeta.name,
        setCode,
        setOrder,
        rowOrder: rowIndex,
        cardNumber: displayNumber,
        cardName,
        copies: row.copies || "",
        cardType: row.cardtype || "",
        cardText: row.cardtext || "",
        rarity: row.rarity || "Common",
        src: `${setMeta.path}/${imageCode}.png`
      };
    });
  }

  async function getSetCards(setMeta, setOrder = 0) {
    if (cardCache.has(setMeta.id)) {
      return cardCache.get(setMeta.id);
    }

    const response = await fetch(setMeta.tsv);
    if (!response.ok) {
      throw new Error(`Could not load set TSV: ${setMeta.tsv}`);
    }

    const tsvText = await response.text();
    const cards = parseTsv(tsvText, setMeta, setOrder);
    cardCache.set(setMeta.id, cards);
    return cards;
  }

  function isUniqueCard(card) {
    return /\bunique\b/i.test(card.cardType || "");
  }

  function isTokenCard(card) {
    const typeText = String(card.cardType || "").toLowerCase();
    const numberText = String(card.cardNumber || "").toLowerCase();
    const rarityText = String(card.rarity || "").toLowerCase();
    return typeText.includes("token") || numberText === "token" || rarityText === "token";
  }

  function parseDeckText(text) {
    const entries = [];
    const issues = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      const match = trimmed.match(/^(\d+)\s*(?:x|×)?\s+(.+)$/i);
      if (!match) {
        issues.push(`Line ${index + 1} is not in Amount x Set/Card format.`);
        return;
      }

      const count = Number.parseInt(match[1], 10);
      const identifierText = normalizeCardIdentifier(match[2]);
      const card = cardIndex.get(identifierText);

      if (!card) {
        issues.push(`Line ${index + 1} references unknown card ${match[2].trim()}.`);
        return;
      }

      entries.push({ count, identifier: `${card.setCode}/${card.cardNumber}`, card });
    });

    return { entries, issues };
  }

  function sortEntries(entries) {
    return [...entries].sort((left, right) => {
      const leftKey = `${left.card.setCode} ${String(left.card.cardNumber).padStart(6, "0")}`;
      const rightKey = `${right.card.setCode} ${String(right.card.cardNumber).padStart(6, "0")}`;
      return leftKey.localeCompare(rightKey);
    });
  }

  function mergeEntries(entries) {
    const merged = new Map();

    entries.forEach((entry) => {
      const current = merged.get(entry.identifier);
      if (current) {
        current.count += entry.count;
        return;
      }

      merged.set(entry.identifier, { ...entry });
    });

    return Array.from(merged.values());
  }

  function getCardTypeGroup(cardType) {
    const normalized = (cardType || "").toLowerCase();
    if (normalized.includes("token")) {
      return "Tokens";
    }
    if (normalized.includes("character")) {
      return "Characters";
    }
    if (normalized.includes("artifact")) {
      return "Artifacts";
    }
    if (normalized.includes("location")) {
      return "Locations";
    }
    if (normalized.includes("action")) {
      return "Actions";
    }
    return "Other";
  }

  function formatCardTextForModal(text) {
    if (!text) {
      return "";
    }

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\s\/\s/g, "<br>")
      .replace(/\n/g, "<br>");
  }

  function openDeckCardModal(card) {
    deckCardModalImage.src = card.src;
    deckCardModalImage.alt = card.cardName;
    deckCardModalTitle.textContent = card.cardName;
    deckCardModalSubtitle.textContent = `${card.setCode}/${card.cardNumber}`;
    deckCardModalType.textContent = card.cardType || "-";
    deckCardModalRarity.textContent = card.rarity || "Common";
    deckCardModalText.innerHTML = formatCardTextForModal(card.cardText);

    deckCardModal.classList.add("is-open");
    deckCardModal.setAttribute("aria-hidden", "false");
  }

  function closeDeckCardModal() {
    deckCardModal.classList.remove("is-open");
    deckCardModal.setAttribute("aria-hidden", "true");
    deckCardModalImage.removeAttribute("src");
  }

  function renderDeckView(entries) {
    deckTypeGroups.innerHTML = "";

    if (entries.length === 0) {
      deckTypeGroups.innerHTML = '<p class="deck-view__empty">No cards in deck yet.</p>';
      selectedDeckCardId = "";
      return;
    }

    const groups = new Map();
    entries.forEach((entry) => {
      const group = getCardTypeGroup(entry.card.cardType);
      const bucket = groups.get(group) || [];
      bucket.push(entry);
      groups.set(group, bucket);
    });

    const groupOrder = ["Characters", "Artifacts", "Locations", "Actions", "Tokens", "Other"];
    groupOrder.forEach((groupName) => {
      const bucket = groups.get(groupName);
      if (!bucket || bucket.length === 0) {
        return;
      }

      bucket.sort((left, right) => left.card.cardName.localeCompare(right.card.cardName));

      const section = document.createElement("section");
      section.className = "deck-view__group";
      section.innerHTML = `<h5>${groupName} <span>${bucket.reduce((sum, row) => sum + row.count, 0)}</span></h5>`;

      const list = document.createElement("div");
      list.className = "deck-view__list";

      bucket.forEach((entry) => {
        const id = `${entry.card.setCode}/${entry.card.cardNumber}`;
        const row = document.createElement("div");
        row.className = `deck-view__item${selectedDeckCardId === id ? " is-active" : ""}`;
        row.innerHTML = `
          <button class="deck-view__inspect" type="button">
            <span class="deck-view__count">${entry.count}</span>
            <span class="deck-view__name">${entry.card.cardName}</span>
            <span class="deck-view__code">${entry.card.setCode}/${entry.card.cardNumber}</span>
          </button>
          <div class="deck-view__count-controls" aria-label="Adjust card count">
            <button class="deck-view__count-btn" type="button" data-delta="-1" aria-label="Remove one copy">-</button>
            <button class="deck-view__count-btn" type="button" data-delta="1" aria-label="Add one copy">+</button>
          </div>
        `;

        const inspectButton = row.querySelector(".deck-view__inspect");
        inspectButton?.addEventListener("click", () => {
          selectedDeckCardId = id;
          openDeckCardModal(entry.card);
          renderDeckView(entries);
        });

        row.querySelectorAll(".deck-view__count-btn").forEach((controlButton) => {
          controlButton.addEventListener("click", () => {
            const delta = Number.parseInt(controlButton.dataset.delta || "0", 10);
            if (!Number.isNaN(delta) && delta !== 0) {
              adjustCardCount(id, delta);
            }
          });
        });

        list.appendChild(row);
      });

      section.appendChild(list);
      deckTypeGroups.appendChild(section);
    });

    const selected = entries.find((entry) => `${entry.card.setCode}/${entry.card.cardNumber}` === selectedDeckCardId);
    if (selected) {
      return;
    }

    const first = entries[0];
    selectedDeckCardId = `${first.card.setCode}/${first.card.cardNumber}`;
  }

  function updateImportStatus(message, isError = false) {
    deckImportStatus.innerHTML = message
      ? `<p class="${isError ? "deck-import-modal__status--error" : "deck-import-modal__status--ok"}">${message}</p>`
      : "";
  }

  function openImportModal() {
    deckImportModal.classList.add("is-open");
    deckImportModal.setAttribute("aria-hidden", "false");
    deckImportInput.focus();
  }

  function closeImportModal() {
    deckImportModal.classList.remove("is-open");
    deckImportModal.setAttribute("aria-hidden", "true");
    updateImportStatus("");
  }

  function getCardsForName(cardName, allowPromos) {
    const candidates = cardsByName.get(normalizeText(cardName)) || [];
    const eligibleCards = allowPromos ? candidates : candidates.filter((card) => !isPromoCard(card));
    return eligibleCards.sort(comparePrintings);
  }

  function pickCardForImport(cardName, allowPromos) {
    const candidates = getCardsForName(cardName, allowPromos);
    return candidates[0] || null;
  }

  function parseNameImport(text, allowPromos) {
    const entries = [];
    const issues = [];

    text.split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      const match = trimmed.match(/^(\d+)\s*(?:x|×)?\s+(.+)$/i);
      if (!match) {
        issues.push(`Line ${index + 1} is not in Amount x Card Name format.`);
        return;
      }

      const count = Number.parseInt(match[1], 10);
      const cardName = match[2].trim();
      const card = pickCardForImport(cardName, allowPromos);

      if (!card) {
        const suffix = allowPromos ? "" : " with promos disabled";
        issues.push(`Line ${index + 1} references unknown or promo-only card ${cardName}${suffix}.`);
        return;
      }

      entries.push({ count, identifier: `${card.setCode}/${card.cardNumber}`, card });
    });

    return { entries, issues };
  }

  function normalizeDeckEntries(entries) {
    return sortEntries(mergeEntries(entries))
      .map((entry) => `${entry.count} x ${entry.card.setCode}/${entry.card.cardNumber}`)
      .join("\n");
  }

  function buildNameExport(entries) {
    const grouped = new Map();
    const order = [];

    entries.forEach((entry) => {
      const key = entry.card.cardName;
      if (!grouped.has(key)) {
        grouped.set(key, { count: 0, card: entry.card });
        order.push(key);
      }
      grouped.get(key).count += entry.count;
    });

    return order
      .map((key) => {
        const entry = grouped.get(key);
        return `${entry.count} x ${entry.card.cardName}`;
      })
      .join("\n");
  }

  function evaluateLegality(entries, issues) {
    const countsByName = new Map();
    const uniqueCountsByExactCard = new Map();
    let totalCards = 0;

    entries.forEach((entry) => {
      if (!isTokenCard(entry.card)) {
        totalCards += entry.count;
      }
      const name = entry.card.cardName;
      countsByName.set(name, (countsByName.get(name) || 0) + entry.count);

      if (isUniqueCard(entry.card)) {
        const key = entry.card.cardName;
        uniqueCountsByExactCard.set(key, (uniqueCountsByExactCard.get(key) || 0) + entry.count);
      }
    });

    const legalityIssues = [...issues];

    if (totalCards !== 27) {
      legalityIssues.push(`Deck must contain exactly 27 cards. Current total: ${totalCards}.`);
    }

    entries.forEach((entry) => {
      if (isBannedCard(entry.card)) {
        legalityIssues.push(`${entry.card.cardName} is banned.`);
      }
    });

    countsByName.forEach((count, cardName) => {
      const card = entries.find((entry) => entry.card.cardName === cardName)?.card;
      const limit = card && isUniqueCard(card) ? 1 : 3;
      if (count > limit) {
        legalityIssues.push(`${cardName} has ${count} copies, but the limit is ${limit}.`);
      }
    });

    uniqueCountsByExactCard.forEach((count, name) => {
      if (count > 1) {
        legalityIssues.push(`Unique card ${name} appears ${count} times, but only one copy is allowed.`);
      }
    });

    return {
      totalCards,
      distinctCards: countsByName.size,
      isLegal: legalityIssues.length === 0,
      issues: legalityIssues
    };
  }

  function renderSummary(result) {
    deckSummary.innerHTML = `
      <article class="deck-builder__stat">
        <span class="deck-builder__stat-label">Total cards</span>
        <strong>${result.totalCards}</strong>
      </article>
      <article class="deck-builder__stat deck-builder__stat--${result.isLegal ? "legal" : "illegal"}">
        <span class="deck-builder__stat-label">Legality</span>
        <strong>${result.isLegal ? "Legal" : "Illegal"}</strong>
      </article>
    `;

    deckStatus.innerHTML = result.isLegal
      ? '<p class="deck-builder__status--legal">Deck is legal under the current rules.</p>'
      : `<p class="deck-builder__status--illegal">${result.issues.length} issue(s) need attention before this deck is legal.</p>`;

    deckIssues.innerHTML = result.issues.length
      ? `<ul>${result.issues.map((issue) => `<li>${issue}</li>`).join("")}</ul>`
      : '<p>No rules issues detected.</p>';
  }

  function updateExports(entries) {
    deckExportSet.value = normalizeDeckEntries(entries);
    deckExportName.value = buildNameExport(entries);
  }

  function updateDeckView() {
    const parsed = parseDeckText(deckInput.value);
    const normalizedEntries = sortEntries(mergeEntries(parsed.entries));
    const result = evaluateLegality(normalizedEntries, parsed.issues);

    const normalizedText = normalizeDeckEntries(normalizedEntries);
    if (deckInput.value !== normalizedText) {
      deckInput.value = normalizedText;
    }

    renderDeckNameSection();
    renderSummary(result);
    updateExports(normalizedEntries);
    renderDeckView(normalizedEntries);
    autosaveActiveDeck();
  }

  function addCard(card) {
    const identifier = `${card.setCode}/${card.cardNumber}`;
    const current = mergeEntries(parseDeckText(deckInput.value).entries);
    const existing = current.find((entry) => entry.identifier === identifier);
    if (existing) {
      existing.count += 1;
    } else {
      current.push({ count: 1, identifier, card });
    }

    deckInput.value = normalizeDeckEntries(current);
    updateDeckView();
  }

  function adjustCardCount(identifier, delta) {
    const current = mergeEntries(parseDeckText(deckInput.value).entries);
    const updated = current
      .map((entry) => {
        if (entry.identifier !== identifier) {
          return entry;
        }
        return { ...entry, count: entry.count + delta };
      })
      .filter((entry) => entry.count > 0);

    if (!updated.find((entry) => entry.identifier === selectedDeckCardId)) {
      selectedDeckCardId = "";
    }

    deckInput.value = normalizeDeckEntries(updated);
    updateDeckView();
  }

  function renderCatalog() {
    const query = normalizeText(searchInput.value);
    const filterSetId = setFilter.value;

    if (!sets || sets.length === 0) {
      catalogGrid.innerHTML = "<p>No sets are available.</p>";
      return;
    }

    const setsToLoad = filterSetId
      ? sets.filter((setMeta) => setMeta.id === filterSetId)
      : sets;

    Promise.all(setsToLoad.map((setMeta) => getSetCards(setMeta)))
      .then((results) => {
        const allCards = results.flat();
        const visibleCards = allCards.filter((card) => {
          if (hideBannedCardsToggle.checked && isBannedCard(card)) {
            return false;
          }
          const haystack = [card.cardName, card.cardNumber, card.setCode, card.cardType, card.cardText, card.rarity]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });

        if (visibleCards.length === 0) {
          catalogGrid.innerHTML = "<p>No cards matched that search.</p>";
          return;
        }

        catalogGrid.innerHTML = "";
        visibleCards.forEach((card) => {
          const cardRow = document.createElement("article");
          cardRow.className = "deck-card";
          cardRow.innerHTML = `
            <img class="deck-card__thumb" src="${card.src}" alt="${card.cardName}" loading="lazy">
            <div class="deck-card__body">
              <div>
                <p class="deck-card__code">${card.setCode}/${card.cardNumber}</p>
                <h4>${card.cardName}</h4>
                <p class="deck-card__meta">${card.cardType || "Card"} · ${card.rarity || "Common"}</p>
              </div>
              <button class="deck-card__add" type="button">Add</button>
            </div>
          `;

          cardRow.querySelector("button")?.addEventListener("click", () => addCard(card));
          catalogGrid.appendChild(cardRow);
        });
      })
      .catch((error) => {
        catalogGrid.innerHTML = `<p>Could not load the catalog: ${error.message}</p>`;
      });
  }

  async function loadCatalogIndex() {
    const allCards = await Promise.all(sets.map((setMeta, setOrder) => getSetCards(setMeta, setOrder)));
    allCards.flat().forEach((card) => {
      cardIndex.set(normalizeCardIdentifier(`${card.setCode}/${card.cardNumber}`), card);
      const bucketKey = normalizeText(card.cardName);
      const bucket = cardsByName.get(bucketKey) || [];
      bucket.push(card);
      cardsByName.set(bucketKey, bucket);
    });

    cardsByName.forEach((cards) => cards.sort(comparePrintings));
  }

  function loadDeckByName(name) {
    const selectedName = normalizeDeckName(name);
    const library = getDeckLibrary();
    const saved = selectedName ? library.decks[selectedName] : "";
    if (!saved && !selectedName) {
      deckStatus.innerHTML = '<p class="deck-builder__status--illegal">Could not load deck.</p>';
      return;
    }

    activeDeckName = selectedName;
    deckInput.value = saved || "";
    updateDeckView();
    library.selected = selectedName;
    saveDeckLibrary(library);
    deckStatus.innerHTML = '<p class="deck-builder__status--legal">Loaded ' + selectedName + '.</p>';
    closeDeckLibraryModal();
  }

  function autosaveActiveDeck() {
    if (!activeDeckName) {
      return;
    }

    const library = getDeckLibrary();
    if (!library.decks[activeDeckName] && !deckInput.value) {
      return;
    }

    library.decks[activeDeckName] = deckInput.value;
    library.selected = activeDeckName;
    saveDeckLibrary(library);
  }

  function deleteDeckByName(name) {
    const selectedName = normalizeDeckName(name);
    if (!selectedName) {
      deckStatus.innerHTML = '<p class="deck-builder__status--illegal">Could not delete deck.</p>';
      return;
    }

    const library = getDeckLibrary();
    if (!library.decks[selectedName] && library.decks[selectedName] != "") {
      deckStatus.innerHTML = '<p class="deck-builder__status--illegal">Deck was not found.</p>';
      return;
    }

    delete library.decks[selectedName];
    if (library.selected === selectedName) {
      library.selected = "";
    }
    if (activeDeckName === selectedName) {
      activeDeckName = "";
      deckInput.value = "";
      updateDeckView();
    }
    saveDeckLibrary(library);
    renderDeckLibraryList();

    deckStatus.innerHTML = '<p class="deck-builder__status--legal">Deleted ' + selectedName + '.</p>';
  }

  function newDeck() {
    const library = getDeckLibrary();
    const decks = Object.keys(library.decks);
    
    let newName = "New Deck";
    let counter = 1;
    while (decks.includes(newName)) {
      counter++;
      newName = "New Deck " + counter;
    }
    
    library.decks[newName] = "";
    library.selected = newName;
    activeDeckName = newName;
    saveDeckLibrary(library);
    
    deckInput.value = "";
    renderDeckLibraryList();
    updateDeckView();
    
    deckStatus.innerHTML = '<p class="deck-builder__status--legal">Created new deck: ' + newName + '.</p>';
  }

  async function copyNameExport() {
    try {
      await window.navigator.clipboard.writeText(deckExportName.value || "");
      deckStatus.innerHTML = '<p class="deck-builder__status--legal">Card name export copied to the clipboard.</p>';
    } catch (error) {
      deckStatus.innerHTML = '<p class="deck-builder__status--illegal">Clipboard access failed. You can copy the export manually.</p>';
    }
  }

  function importDeckFromNames() {
    const allowPromos = deckImportAllowPromos.checked;
    const parsed = parseNameImport(deckImportInput.value, allowPromos);

    if (parsed.issues.length > 0) {
      updateImportStatus(parsed.issues.join(" "), true);
      return;
    }

    deckInput.value = normalizeDeckEntries(mergeEntries(parsed.entries));
    updateDeckView();
    deckStatus.innerHTML = '<p class="deck-builder__status--legal">Deck imported from card names.</p>';
    closeImportModal();
  }

  setFilter.addEventListener("change", renderCatalog);
  searchInput.addEventListener("input", renderCatalog);
  hideBannedCardsToggle.addEventListener("change", renderCatalog);
  deckInput.addEventListener("input", updateDeckView);
  deckImportOpen.addEventListener("click", openImportModal);
  deckImportClose.addEventListener("click", closeImportModal);
  deckImportCancel.addEventListener("click", closeImportModal);
  deckImportRun.addEventListener("click", importDeckFromNames);
  deckImportModal.addEventListener("click", (event) => {
    if (event.target === deckImportModal) {
      closeImportModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && deckImportModal.classList.contains("is-open")) {
      closeImportModal();
      return;
    }
    if (event.key === "Escape" && deckLibraryModal.classList.contains("is-open")) {
      closeDeckLibraryModal();
      return;
    }
    if (event.key === "Escape" && deckCardModal.classList.contains("is-open")) {
      closeDeckCardModal();
    }
  });
  deckCardModalClose.addEventListener("click", closeDeckCardModal);
  deckCardModalCloseBottom.addEventListener("click", closeDeckCardModal);
  deckCardModal.addEventListener("click", (event) => {
    if (event.target === deckCardModal) {
      closeDeckCardModal();
    }
  });
  deckLibraryOpen.addEventListener("click", openDeckLibraryModal);
  deckLibraryClose.addEventListener("click", closeDeckLibraryModal);
  deckLibraryModal.addEventListener("click", (event) => {
    if (event.target === deckLibraryModal) {
      closeDeckLibraryModal();
    }
  });
  deckLibraryOpen.addEventListener("click", openDeckLibraryModal);
  deckLibraryClose.addEventListener("click", closeDeckLibraryModal);
  deckLibraryModal.addEventListener("click", (event) => {
    if (event.target === deckLibraryModal) {
      closeDeckLibraryModal();
    }
  });
  deckNew.addEventListener("click", newDeck);
  deckCopyExport.addEventListener("click", copyNameExport);

  loadCatalogIndex()
    .then(() => {
      migrateLegacyDeck();
      renderDeckLibraryList();
      updateDeckView();
      renderCatalog();
    })
    .catch((error) => {
      catalogGrid.innerHTML = `<p>Could not initialize the deck builder: ${error.message}</p>`;
    });
})();