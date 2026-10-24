const searchInput = document.getElementById("search");
const resetButton = document.getElementById("reset");
const catchupInput = document.getElementById("catchup");
const actionList = document.getElementById("actions");
const surpriseButton = document.getElementById("surprise");
const randomResult = document.getElementById("random-result");
const randomTitle = document.getElementById("random-title");
const randomMeta = document.getElementById("random-meta");
const randomLink = document.getElementById("random-link");
const scopeOptions = document.getElementById("scope-options");
const filterNames = ["points", "team", "status"];
const selected = { points: "", team: "", status: "" };
const available = { points: [], team: [], status: [] };
let actions = [];
let visibleActions = [];
let lastSuggestion = null;

const statusNames = {
  Accepted: "Angenommen",
  Proposal: "Vorgeschlagen",
  Finished: "Durchgeführt"
};
const teamNames = {
  Single: "Einzelperson",
  Miniteam: "Kleines Team"
};

function displayValue(name, value) {
  if (name === "points") return `${value} ${value === "1" ? "Punkt" : "Punkte"}`;
  if (name === "status") return statusNames[value] || value;
  if (name === "team") return teamNames[value] || value;
  return value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))]
    .sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
}

function selectedScopes() {
  return [...scopeOptions.querySelectorAll("input:checked")].map(input => input.value);
}

function filterParams() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
  if (catchupInput.checked) params.set("catchup", "1");
  for (const name of filterNames) {
    if (selected[name]) params.set(name, selected[name]);
  }
  for (const scope of selectedScopes()) params.append("scope", scope);
  return params;
}

function restoreFilters() {
  const params = new URLSearchParams(location.search);
  searchInput.value = params.get("q") || "";
  catchupInput.checked = params.get("catchup") === "1";
  for (const name of filterNames) {
    const value = params.get(name) || "";
    selected[name] = available[name].includes(value) ? value : "";
  }
  const scopes = new Set(params.getAll("scope"));
  scopeOptions.querySelectorAll("input").forEach(input => {
    input.checked = scopes.has(input.value);
  });
}

function createMenu(name, values) {
  available[name] = ["", ...unique(values)];
  const menu = document.getElementById(`${name}-options`);
  const dropdown = document.getElementById(`${name}-filter`);

  for (const value of available[name]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-option";
    button.dataset.value = value;
    button.textContent = value ? displayValue(name, value) : "Alle";
    button.addEventListener("click", () => {
      selected[name] = value;
      dropdown.open = false;
      render();
      dropdown.querySelector("summary").focus();
    });
    menu.append(button);
  }
}

function updateMenus() {
  for (const name of filterNames) {
    const value = selected[name];
    document.getElementById(`${name}-value`).textContent = value
      ? displayValue(name, value) : "Alle";
    document.querySelectorAll(`#${name}-options button`).forEach(button => {
      button.setAttribute("aria-current", String(button.dataset.value === value));
    });
  }
}

function updateScopeChips(scopes) {
  const container = document.getElementById("selected-scopes");
  const chips = document.getElementById("scope-chips");
  document.getElementById("scope-summary").textContent = scopes.length
    ? `${scopes.length} ausgewählt` : "Alle";
  container.hidden = scopes.length === 0;
  chips.replaceChildren();

  for (const scope of scopes) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = `${scope} ×`;
    chip.setAttribute("aria-label", `${scope} entfernen`);
    chip.addEventListener("click", () => {
      const checkbox = [...scopeOptions.querySelectorAll("input")]
        .find(input => input.value === scope);
      checkbox.checked = false;
      render();
    });
    chips.append(chip);
  }
}

function makeCard(action, params) {
  const item = document.createElement("li");
  const card = document.createElement("a");
  card.className = "action";
  if (action.status === "Proposal") card.classList.add("action-proposal");

  const linkParams = new URLSearchParams(params);
  linkParams.set("id", action.id);
  card.href = `aktion.html?${linkParams}`;

  const title = document.createElement("span");
  title.className = "action-title";
  title.textContent = action.title;

  const meta = document.createElement("span");
  meta.className = "meta";
  function addTags(values, type) {
    const group = document.createElement("span");
    group.className = "tag-group";
    for (const value of values) {
      const tag = document.createElement("span");
      tag.className = `tag tag-${type}`;
      tag.textContent = value;
      group.append(tag);
    }
    meta.append(group);
  }

  addTags(action.points.map(points => `${points} ${points === 1 ? "Punkt" : "Punkte"}`), "points");
  if (action.catchup) addTags(["Punkte nachholen"], "catchup");
  addTags(action.teams.map(team => displayValue("team", team)), "team");
  addTags(action.status ? [displayValue("status", action.status)] : [],
    action.status === "Proposal" ? "status-proposal" : "status");
  if (action.state === "closed") addTags(["Geschlossen"], "closed");
  addTags(action.scopes, "scope");
  if (action.term) {
    const term = document.createElement("span");
    term.className = "tag tag-term";
    term.textContent = `Termin: ${action.term}`;
    meta.lastElementChild.append(term);
  }

  const hint = document.createElement("span");
  hint.className = "action-hint";
  hint.textContent = "Mehr erfahren";
  card.append(title, meta, hint);
  item.append(card);
  return item;
}

function render() {
  const params = filterParams();
  resetButton.disabled = params.toString() === "";
  const url = new URL(location.href);
  if (url.searchParams.toString() !== params.toString()) {
    url.search = params.toString();
    history.replaceState(null, "", url);
  }

  const scopes = selectedScopes();
  const query = searchInput.value.trim().toLocaleLowerCase("de");
  updateMenus();
  updateScopeChips(scopes);

  const shown = actions.filter(action =>
    action.title.toLocaleLowerCase("de").includes(query) &&
    (!catchupInput.checked || action.catchup) &&
    (!selected.points || action.points.includes(Number(selected.points))) &&
    (!selected.team || action.teams.includes(selected.team)) &&
    (!selected.status || (selected.status === "Geschlossen"
      ? action.state === "closed" : action.status === selected.status)) &&
    (!scopes.length || action.scopes.some(scope => scopes.includes(scope)))
  );

  visibleActions = shown;
  actionList.replaceChildren(...shown.map(action => makeCard(action, params)));
  surpriseButton.disabled = shown.length === 0;
  randomResult.hidden = true;
  document.getElementById("count").textContent =
    `${shown.length} ${shown.length === 1 ? "Aktion" : "Aktionen"} gefunden`;
  document.getElementById("empty").hidden = shown.length !== 0;
}

async function start() {
  try {
    const response = await fetch("data/actions.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    actions = await response.json();
    if (!Array.isArray(actions)) throw new Error("Aktionsliste fehlt");

    createMenu("points", actions.flatMap(action => action.points));
    createMenu("team", actions.flatMap(action => action.teams));
    createMenu("status", [...actions.map(action => action.status), "Geschlossen"]);

    unique(actions.flatMap(action => action.scopes)).forEach((scope, index) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = scope;
      checkbox.id = `scope-${index}`;
      checkbox.addEventListener("change", render);
      label.htmlFor = checkbox.id;
      label.append(checkbox, document.createTextNode(scope));
      scopeOptions.append(label);
    });

    restoreFilters();
    searchInput.addEventListener("input", render);
    catchupInput.addEventListener("change", render);
    render();
  } catch (error) {
    console.error(error);
    document.getElementById("error").hidden = false;
  }
}

surpriseButton.addEventListener("click", () => {
  if (!visibleActions.length) return;
  const choices = visibleActions.length > 1
    ? visibleActions.filter(action => action.id !== lastSuggestion)
    : visibleActions;
  const action = choices[Math.floor(Math.random() * choices.length)];
  lastSuggestion = action.id;

  randomTitle.textContent = action.title;
  randomMeta.replaceChildren();
  for (const points of action.points) {
    const tag = document.createElement("span");
    tag.className = "tag tag-points";
    tag.textContent = `${points} ${points === 1 ? "Punkt" : "Punkte"}`;
    randomMeta.append(tag);
  }
  if (action.state === "closed") {
    const tag = document.createElement("span");
    tag.className = "tag tag-closed";
    tag.textContent = "Geschlossen";
    randomMeta.append(tag);
  }

  const params = filterParams();
  params.set("id", action.id);
  randomLink.href = `aktion.html?${params}`;
  randomLink.setAttribute("aria-label", `${action.title} ansehen`);
  randomResult.hidden = false;
});

document.getElementById("reset").addEventListener("click", () => {
  searchInput.value = "";
  catchupInput.checked = false;
  for (const name of filterNames) selected[name] = "";
  scopeOptions.querySelectorAll("input").forEach(input => { input.checked = false; });
  document.querySelectorAll(".choice-filter, .multi-filter").forEach(dropdown => {
    dropdown.open = false;
  });
  render();
});

document.addEventListener("click", event => {
  document.querySelectorAll(".choice-filter, .multi-filter").forEach(dropdown => {
    if (!dropdown.contains(event.target)) dropdown.open = false;
  });
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  const dropdown = document.querySelector(".choice-filter[open], .multi-filter[open]");
  if (!dropdown) return;
  dropdown.open = false;
  dropdown.querySelector("summary").focus();
});

start();
