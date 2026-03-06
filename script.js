const plannerKey = "grepolis_wiki_planner_v1";
const checklistKey = "grepolis_wiki_checklist_v1";

const projectionMix = [
  { key: "def_terre", shortLabel: "DF terre", ratio: 0.35, priority: 1 },
  { key: "def_navale", shortLabel: "DEF navale", ratio: 0.25, priority: 2 },
  { key: "off_terre", shortLabel: "OFF terre", ratio: 0.25, priority: 3 },
  { key: "mythique_att", shortLabel: "Mythique", ratio: 0.15, priority: 4 }
];

const specLabels = {
  def_terre: "DF terre",
  def_navale: "DEF navale",
  off_terre: "OFF terrestre conquête",
  mythique_att: "Mythique attaquante",
  croissance_colo: "Croissance / colonisation",
  full_fire: "Full bateau-feu",
  full_bireme: "Full birèmes",
  full_def: "DF terre",
  off_land: "OFF terrestre conquête",
  farm_festival: "Croissance / colonisation"
};

const statusLabels = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée"
};

const currentCityCountInput = document.querySelector("#currentCityCount");
const targetCityCountInput = document.querySelector("#targetCityCount");
const calcBtn = document.querySelector("#calcBtn");
const calcResult = document.querySelector("#calcResult");

const cityForm = document.querySelector("#cityForm");
const plannerBody = document.querySelector("#plannerBody");
const plannerStats = document.querySelector("#plannerStats");
const resetPlannerBtn = document.querySelector("#resetPlanner");

const checklistBoxes = Array.from(document.querySelectorAll("[data-checklist-id]"));
const checklistProgress = document.querySelector("#checklistProgress");
const resetChecklistBtn = document.querySelector("#resetChecklist");

let plannerEntries = loadPlanner();
let checklistState = loadChecklist();

function distributeByRatios(total) {
  const rows = projectionMix.map((item) => {
    const exact = total * item.ratio;
    return {
      key: item.key,
      exact,
      count: Math.floor(exact),
      fraction: exact - Math.floor(exact),
      priority: item.priority
    };
  });

  let remaining = total - rows.reduce((sum, row) => sum + row.count, 0);

  rows
    .slice()
    .sort((a, b) => {
      if (b.fraction !== a.fraction) {
        return b.fraction - a.fraction;
      }
      return a.priority - b.priority;
    })
    .forEach((row) => {
      if (remaining > 0) {
        row.count += 1;
        remaining -= 1;
      }
    });

  const result = {};
  for (const row of rows) {
    result[row.key] = row.count;
  }
  return result;
}

function formatDistribution(distribution) {
  return projectionMix
    .map((item) => `${item.shortLabel}: ${distribution[item.key] || 0}`)
    .join(", ");
}

function renderDistribution() {
  const current = Number(currentCityCountInput?.value);
  const target = Number(targetCityCountInput?.value);

  if (!Number.isFinite(current) || !Number.isFinite(target) || current < 1 || target < 1) {
    calcResult.textContent = "Saisis des valeurs valides pour les villes actuelles et la cible.";
    return;
  }

  if (target < current) {
    calcResult.textContent = "La cible doit être supérieure ou égale au nombre de villes actuelles.";
    return;
  }

  const currentDist = distributeByRatios(current);
  const targetDist = distributeByRatios(target);

  const additions = projectionMix
    .map((item) => {
      const diff = (targetDist[item.key] || 0) - (currentDist[item.key] || 0);
      return { label: item.shortLabel, diff };
    })
    .filter((item) => item.diff > 0)
    .map((item) => `${item.label} +${item.diff}`);

  const gap = target - current;
  const additionText = additions.length ? additions.join(", ") : "Aucune nouvelle ville requise.";

  calcResult.textContent =
    `Actuel ${current}: ${formatDistribution(currentDist)}. ` +
    `Cible ${target}: ${formatDistribution(targetDist)}. ` +
    `À ajouter (${gap}): ${additionText}`;
}

function normalizeSpec(spec) {
  if (spec === "full_def") {
    return "def_terre";
  }
  if (spec === "off_land") {
    return "off_terre";
  }
  if (spec === "farm_festival") {
    return "croissance_colo";
  }
  return spec;
}

function loadPlanner() {
  try {
    const raw = localStorage.getItem(plannerKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function savePlanner() {
  localStorage.setItem(plannerKey, JSON.stringify(plannerEntries));
}

function renderPlanner() {
  plannerBody.innerHTML = "";

  if (!plannerEntries.length) {
    plannerStats.textContent = "Aucune ville enregistrée.";
    return;
  }

  const specCount = {
    def_terre: 0,
    def_navale: 0,
    off_terre: 0,
    mythique_att: 0,
    croissance_colo: 0,
    full_fire: 0,
    full_bireme: 0
  };

  let completed = 0;

  for (const entry of plannerEntries) {
    const normalizedSpec = normalizeSpec(entry.spec);
    if (specCount[normalizedSpec] !== undefined) {
      specCount[normalizedSpec] += 1;
    }

    if (entry.status === "terminee") {
      completed += 1;
    }

    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = entry.name;
    row.appendChild(nameCell);

    const specCell = document.createElement("td");
    specCell.textContent = specLabels[entry.spec] || specLabels[normalizedSpec] || entry.spec;
    row.appendChild(specCell);

    const statusCell = document.createElement("td");
    const statusTag = document.createElement("span");
    statusTag.className = `status status--${entry.status}`;
    statusTag.textContent = statusLabels[entry.status] || entry.status;
    statusCell.appendChild(statusTag);
    row.appendChild(statusCell);

    const noteCell = document.createElement("td");
    noteCell.textContent = entry.note || "-";
    row.appendChild(noteCell);

    const actionCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Supprimer";
    removeBtn.addEventListener("click", () => {
      plannerEntries = plannerEntries.filter((item) => item.id !== entry.id);
      savePlanner();
      renderPlanner();
      renderDistribution();
    });
    actionCell.appendChild(removeBtn);
    row.appendChild(actionCell);

    plannerBody.appendChild(row);
  }

  const navalOff = specCount.full_fire + specCount.full_bireme;

  plannerStats.textContent =
    `Total: ${plannerEntries.length} villes | Terminées: ${completed} | ` +
    `DF terre: ${specCount.def_terre}, DEF navale: ${specCount.def_navale}, ` +
    `OFF terre: ${specCount.off_terre}, Mythique: ${specCount.mythique_att}, ` +
    `Croissance: ${specCount.croissance_colo}, Naval OFF: ${navalOff}`;
}

function loadChecklist() {
  try {
    const raw = localStorage.getItem(checklistKey);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveChecklist() {
  localStorage.setItem(checklistKey, JSON.stringify(checklistState));
}

function renderChecklist() {
  if (!checklistBoxes.length) {
    return;
  }

  let checkedCount = 0;
  for (const box of checklistBoxes) {
    const id = box.dataset.checklistId;
    const checked = Boolean(checklistState[id]);
    box.checked = checked;
    if (checked) {
      checkedCount += 1;
    }
  }

  if (checklistProgress) {
    checklistProgress.textContent = `Checklist: ${checkedCount}/${checklistBoxes.length} objectifs cochés.`;
  }
}

if (calcBtn) {
  calcBtn.addEventListener("click", renderDistribution);
}
if (currentCityCountInput) {
  currentCityCountInput.addEventListener("input", renderDistribution);
}
if (targetCityCountInput) {
  targetCityCountInput.addEventListener("input", renderDistribution);
}

if (cityForm) {
  cityForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(cityForm);

    const entry = {
      id: Date.now().toString(36),
      name: String(formData.get("name") || "").trim(),
      spec: String(formData.get("spec") || ""),
      status: String(formData.get("status") || ""),
      note: String(formData.get("note") || "").trim()
    };

    if (!entry.name || !entry.spec || !entry.status) {
      return;
    }

    plannerEntries.unshift(entry);
    savePlanner();
    renderPlanner();
    cityForm.reset();
  });
}

if (resetPlannerBtn) {
  resetPlannerBtn.addEventListener("click", () => {
    if (!plannerEntries.length) {
      return;
    }
    const confirmed = window.confirm("Vider toutes les entrées du planificateur ?");
    if (!confirmed) {
      return;
    }
    plannerEntries = [];
    savePlanner();
    renderPlanner();
  });
}

for (const box of checklistBoxes) {
  box.addEventListener("change", () => {
    const id = box.dataset.checklistId;
    if (!id) {
      return;
    }
    checklistState[id] = box.checked;
    saveChecklist();
    renderChecklist();
  });
}

if (resetChecklistBtn) {
  resetChecklistBtn.addEventListener("click", () => {
    const confirmed = window.confirm("Réinitialiser toute la checklist ?");
    if (!confirmed) {
      return;
    }
    checklistState = {};
    saveChecklist();
    renderChecklist();
  });
}

renderDistribution();
renderPlanner();
renderChecklist();
