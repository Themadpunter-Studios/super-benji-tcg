(() => {
  const setsNode = document.getElementById("sets-json");
  const setFilter = document.getElementById("set-filter");
  const searchInput = document.getElementById("card-search");
  const catalogGrid = document.getElementById("catalog-grid");
  const deckInput = document.getElementById("deck-input");
  const deckIssues = document.getElementById("deck-issues");
  const deckSummary = document.getElementById("deck-summary");
  const deckStatus = document.getElementById("deck-status");
  const deckExportSet = document.getElementById("deck-export-set");
  const deckExportName = document.getElementById("deck-export-name");
  const deckSave = document.getElementById("deck-save");
  const deckLoad = document.getElementById("deck-load");
  const deckClear = document.getElementById("deck-clear");
  const deckCopyExport = document.getElementById("deck-copy-export");

  if (!setsNode || !setFilter || !searchInput || !catalogGrid || !deckInput || !deckIssues || !deckSummary || !deckStatus || !deckExportSet || !deckExportName || !deckSave || !deckLoad || !deckClear || !deckCopyExport) {
    return;
  }

  const storageKey = "super-benji-deck-builder-v1";
  const sets = JSON.parse(setsNode.textContent || "[]");
  const cardCache = new Map();
  const cardIndex = new Map();

  function cardCode(index, padding) {
    return String(index).padStart(padding, "0");
  }

  function normalizeText(value) {
    return (value || "").toLowerCase().trim();
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

  function parseTsv(text, setMeta) {
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

  async function getSetCards(setMeta) {
    if (cardCache.has(setMeta.id)) {
      return cardCache.get(setMeta.id);
    }

    const response = await fetch(setMeta.tsv);
    if (!response.ok) {
      throw new Error(`Could not load set TSV: ${setMeta.tsv}`);
    }

    const tsvText = await response.text();
    const cards = parseTsv(tsvText, setMeta);
    cardCache.set(setMeta.id, cards);
    return cards;
  }

  function isUniqueCard(card) {
    return /\bunique\b/i.test(card.cardType || "");
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
      totalCards += entry.count;
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

  function renderSummary(result, entries) {
    const uniqueCards = new Set(entries.map((entry) => entry.card.cardName)).size;
    deckSummary.innerHTML = `
      <article class="deck-builder__stat">
        <span class="deck-builder__stat-label">Total cards</span>
        <strong>${result.totalCards}</strong>
      </article>
      <article class="deck-builder__stat">
        <span class="deck-builder__stat-label">Unique names</span>
        <strong>${uniqueCards}</strong>
      </article>
      <article class="deck-builder__stat">
        <span class="deck-builder__stat-label">Distinct entries</span>
        <strong>${result.distinctCards}</strong>
      </article>
      <article class="deck-builder__stat deck-builder__stat--${result.isLegal ? "legal" : "illegal"}">
        <span class="deck-builder__stat-label">Legality</span>
        <strong>${result.isLegal ? "Legal" : "Needs work"}</strong>
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

    renderSummary(result, normalizedEntries);
    updateExports(normalizedEntries);
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

  function renderCatalog() {
    const activeSet = sets.find((setMeta) => setMeta.id === setFilter.value) || sets[0];
    const query = normalizeText(searchInput.value);

    if (!activeSet) {
      catalogGrid.innerHTML = "<p>No sets are available.</p>";
      return;
    }

    getSetCards(activeSet)
      .then((cards) => {
        const visibleCards = cards.filter((card) => {
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
    const allCards = await Promise.all(sets.map((setMeta) => getSetCards(setMeta)));
    allCards.flat().forEach((card) => {
      cardIndex.set(normalizeCardIdentifier(`${card.setCode}/${card.cardNumber}`), card);
    });
  }

  function saveDeck() {
    window.localStorage.setItem(storageKey, deckInput.value);
    deckStatus.innerHTML = '<p class="deck-builder__status--legal">Deck saved locally in this browser.</p>';
  }

  function loadDeck() {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      deckInput.value = saved;
      updateDeckView();
      deckStatus.innerHTML = '<p class="deck-builder__status--legal">Loaded the saved deck.</p>';
    }
  }

  function clearDeck() {
    deckInput.value = "";
    updateDeckView();
  }

  async function copyNameExport() {
    try {
      await window.navigator.clipboard.writeText(deckExportName.value || "");
      deckStatus.innerHTML = '<p class="deck-builder__status--legal">Card name export copied to the clipboard.</p>';
    } catch (error) {
      deckStatus.innerHTML = '<p class="deck-builder__status--illegal">Clipboard access failed. You can copy the export manually.</p>';
    }
  }

  setFilter.addEventListener("change", renderCatalog);
  searchInput.addEventListener("input", renderCatalog);
  deckInput.addEventListener("input", updateDeckView);
  deckSave.addEventListener("click", saveDeck);
  deckLoad.addEventListener("click", loadDeck);
  deckClear.addEventListener("click", clearDeck);
  deckCopyExport.addEventListener("click", copyNameExport);

  loadCatalogIndex()
    .then(() => {
      loadDeck();
      updateDeckView();
      renderCatalog();
    })
    .catch((error) => {
      catalogGrid.innerHTML = `<p>Could not initialize the deck builder: ${error.message}</p>`;
    });
})();