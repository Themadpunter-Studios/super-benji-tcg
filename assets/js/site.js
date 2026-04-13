(() => {
  function initShowcaseCarousel() {
    const track = document.querySelector(".carousel-3d__track");
    if (!track) {
      return;
    }

    const cards = Array.from(track.querySelectorAll("img"));
    if (cards.length === 0) {
      return;
    }

    let activeIndex = 0;
    let timerId = null;

    function render() {
      const total = cards.length;
      cards.forEach((card, idx) => {
        let delta = idx - activeIndex;
        if (delta > total / 2) {
          delta -= total;
        }
        if (delta < -total / 2) {
          delta += total;
        }

        const distance = Math.abs(delta);
        const scale = Math.max(0.62, 1.22 - distance * 0.15);
        const x = delta * 108;
        const y = distance * 12;
        const z = 130 - distance * 18;
        const opacity = Math.max(0.34, 1 - distance * 0.14);

        card.style.transform = `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) scale(${scale})`;
        card.style.opacity = `${opacity}`;
        card.style.zIndex = `${Math.round(z)}`;
      });
    }

    function start() {
      if (timerId) {
        return;
      }
      timerId = window.setInterval(() => {
        activeIndex = (activeIndex + 1) % cards.length;
        render();
      }, 2200);
    }

    function stop() {
      if (!timerId) {
        return;
      }
      window.clearInterval(timerId);
      timerId = null;
    }

    track.addEventListener("mouseenter", stop);
    track.addEventListener("mouseleave", start);

    render();
    start();
  }

  initShowcaseCarousel();

  const setsNode = document.getElementById("sets-json");
  const setFilter = document.getElementById("set-filter");
  const searchInput = document.getElementById("card-search");
  const gallery = document.getElementById("gallery-grid");
  const setDescription = document.getElementById("set-description");

  const modal = document.getElementById("card-modal");
  const modalImage = document.getElementById("card-modal-image");
  const modalCaption = document.getElementById("card-modal-caption");
  const modalTitle = document.getElementById("card-modal-title");
  const modalSubtitle = document.getElementById("card-modal-subtitle");
  const modalType = document.getElementById("card-modal-type");
  const modalRarity = document.getElementById("card-modal-rarity");
  const modalText = document.getElementById("card-modal-text");
  const modalClose = document.getElementById("card-modal-close");

  if (!setsNode || !setFilter || !searchInput || !gallery || !setDescription) {
    return;
  }

  const sets = JSON.parse(setsNode.textContent || "[]");
  const cardCache = new Map();

  function cardCode(index, padding) {
    return String(index).padStart(padding, "0");
  }

  function hasNumericCardNumber(cardNumber) {
    return /^\d+$/.test((cardNumber || "").trim());
  }

  function formatCardNumber(cardNumber) {
    return hasNumericCardNumber(cardNumber) ? `#${cardNumber}` : cardNumber;
  }

  function normalizeIconFile(iconFile) {
    const lower = iconFile.toLowerCase();
    if (lower === "actionlogo.png") {
      return "actionLogo2.png";
    }
    if (lower === "locationlogo.png") {
      return "locationLogo2.png";
    }
    return iconFile;
  }

  function parseTsv(text) {
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
      const iconFile = normalizeIconFile(row.cardtypeimage || "");
      const cardNumber = row["card number"] || "";
      const numericCardNumber = Number.parseInt(cardNumber, 10);
      const displayNumber = Number.isNaN(numericCardNumber) ? cardNumber : String(numericCardNumber);

      return {
        code: imageCode,
        cardNumber: displayNumber,
        cardName: row.cardname || `Card ${rowIndex + 1}`,
        copies: row.copies || "",
        cardType: row.cardtype || "",
        cardText: row.cardtext || "",
        rarity: row.rarity || "Common",
        setName: row["set name"] || "",
        iconSrc: iconFile ? `icons/${iconFile}` : "",
        src: `${row.__setpath}/${imageCode}.png`
      };
    });
  }

  async function getSetCards(setMeta) {
    if (cardCache.has(setMeta.id)) {
      return cardCache.get(setMeta.id);
    }

    let cards = [];
    if (setMeta.tsv) {
      const response = await fetch(setMeta.tsv);
      if (!response.ok) {
        throw new Error(`Could not load set TSV: ${setMeta.tsv}`);
      }
      const tsvText = await response.text();
      // Inject the configured image base path before parsing.
      const lines = tsvText.split(/\r?\n/);
      const headerLine = lines.shift() || "";
      const augmented = [
        `${headerLine}\t__setPath`,
        ...lines.map((line) => (line.trim().length > 0 ? `${line}\t${setMeta.path}` : line))
      ].join("\n");
      cards = parseTsv(augmented);
    } else {
      for (let i = 0; i < setMeta.total_cards; i += 1) {
        const code = `${setMeta.code_prefix}${cardCode(i, setMeta.code_padding)}`;
        cards.push({
          code,
          cardNumber: String(i + 1),
          cardName: `${setMeta.name} Card ${i + 1}`,
          copies: "",
          cardType: "",
          cardText: "",
          rarity: "Common",
          setName: setMeta.name,
          iconSrc: "",
          src: `${setMeta.path}/${code}.png`
        });
      }
    }

    cardCache.set(setMeta.id, cards);
    return cards;
  }

  function withInlineIcons(input) {
    return input.replace(/\{icons\/([^}]+)\}/g, (match, filename) => {
      return `<img class="inline-icon" src="icons/${filename}" alt="${filename}">`;
    });
  }

  function formatCardText(input) {
    if (!input) {
      return "";
    }

    const withBreaks = input.replace(/\s\/\s/g, "<br>");
    return withInlineIcons(withBreaks);
  }

  function openModal(card) {
    if (!modal || !modalImage) {
      return;
    }

    modalImage.src = card.src;
    if (modalCaption) {
      const cardNumberLabel = formatCardNumber(card.cardNumber);
      modalCaption.textContent = cardNumberLabel
        ? `${card.cardName} (${cardNumberLabel})`
        : card.cardName;
    }
    if (modalTitle) {
      modalTitle.textContent = card.cardName;
    }
    if (modalSubtitle) {
      const cardNumberLabel = formatCardNumber(card.cardNumber);
      modalSubtitle.textContent = cardNumberLabel
        ? `${card.setName} ${cardNumberLabel}`
        : card.setName;
    }
    if (modalType) {
      modalType.textContent = card.cardType || "-";
    }
    if (modalRarity) {
      modalRarity.textContent = card.rarity || "Common";
    }
    if (modalText) {
      modalText.innerHTML = formatCardText(card.cardText);
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal || !modalImage) {
      return;
    }
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalImage.src = "";
  }

  async function render() {
    const activeSet = sets.find((setMeta) => setMeta.id === setFilter.value) || sets[0];
    const query = searchInput.value.trim().toLowerCase();

    if (!activeSet) {
      gallery.innerHTML = "<p>No sets available yet.</p>";
      return;
    }

    setDescription.textContent = activeSet.description;
    let cards = [];
    try {
      cards = await getSetCards(activeSet);
    } catch (error) {
      gallery.innerHTML = "<p>Could not load set data.</p>";
      return;
    }

    const visibleCards = cards.filter((card) => {
      const haystack = `${card.cardNumber} ${card.cardName} ${card.code}`.toLowerCase();
      return haystack.includes(query);
    });

    gallery.innerHTML = "";

    if (visibleCards.length === 0) {
      gallery.innerHTML = "<p>No cards matched that number.</p>";
      return;
    }

    visibleCards.forEach((card) => {
      const tile = document.createElement("button");
      tile.className = "card-tile";
      tile.type = "button";
      const iconHtml = card.iconSrc
        ? `<img class="card-tile__icon" src="${card.iconSrc}" alt="${card.cardName} type icon" loading="lazy">`
        : "";

      tile.innerHTML = `
        <figure>
          <img class="card-tile__image" src="${card.src}" alt="${card.setName} card ${card.code}" loading="lazy">
          <figcaption>
            <span class="card-tile__number">${formatCardNumber(card.cardNumber)}</span>
            <span class="card-tile__name">${card.cardName}</span>
            <span class="card-tile__meta">${iconHtml}${card.rarity || "Common"}</span>
          </figcaption>
        </figure>
      `;
      tile.addEventListener("click", () => openModal(card));
      gallery.appendChild(tile);
    });
  }

  setFilter.addEventListener("change", render);
  searchInput.addEventListener("input", render);

  modalClose?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  render();
})();
