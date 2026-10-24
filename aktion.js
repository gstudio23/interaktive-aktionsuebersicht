const statusNames = {
  Accepted: "Angenommen",
  Proposal: "Vorgeschlagen",
  Finished: "Durchgeführt"
};
const teamNames = {
  Single: "Einzelperson",
  Miniteam: "Kleines Team"
};

function cleanInline(text) {
  return text.replace(/[`*]/g, "").trim();
}

function appendInline(element, source, issueUrl) {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let start = 0;
  for (const match of source.matchAll(linkPattern)) {
    element.append(document.createTextNode(cleanInline(source.slice(start, match.index))));
    const url = match[2].startsWith("/uploads/")
      ? `${issueUrl.split("/-/work_items/")[0]}${match[2]}`
      : match[2];
    if (/^https?:\/\//.test(url)) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = cleanInline(match[1]);
      element.append(link);
    } else {
      element.append(document.createTextNode(cleanInline(match[1])));
    }
    start = match.index + match[0].length;
  }
  element.append(document.createTextNode(cleanInline(source.slice(start))));
}

function renderDescription(container, source, issueUrl) {
  const lines = source.split(/\r?\n/);
  let section = null;
  let list = null;
  let paragraph = [];

  function ensureSection() {
    if (!section) {
      section = document.createElement("section");
      section.className = "detail-section";
      if (!container.children.length) {
        const heading = document.createElement("h2");
        heading.textContent = "Beschreibung";
        section.append(heading);
      }
      container.append(section);
    }
  }
  function flushParagraph() {
    if (!paragraph.length) return;
    ensureSection();
    const p = document.createElement("p");
    appendInline(p, paragraph.join(" "), issueUrl);
    section.append(p);
    paragraph = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const markdownHeading = line.match(/^#{1,4}\s+(.+)$/);
    const boldHeading = line.match(/^\*\*(.+?)\*\*$/);
    const heading = markdownHeading ||
      (boldHeading && !/^\d{1,2}:\d{2}\b/.test(boldHeading[1]) ? boldHeading : null);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (heading) {
      flushParagraph();
      section = document.createElement("section");
      section.className = "detail-section";
      const h2 = document.createElement("h2");
      h2.textContent = cleanInline(heading[1]);
      section.append(h2);
      container.append(section);
      list = null;
    } else if (bullet) {
      flushParagraph();
      ensureSection();
      if (!list) {
        list = document.createElement("ul");
        section.append(list);
      }
      const item = document.createElement("li");
      appendInline(item, bullet[1], issueUrl);
      list.append(item);
    } else if (!line) {
      flushParagraph();
      list = null;
    } else {
      list = null;
      paragraph.push(line);
    }
  }
  flushParagraph();
}

async function showAction() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  params.delete("id");
  const backUrl = new URL("index.html", location.href);
  backUrl.search = params.toString();
  document.querySelectorAll(".back-link, .corner-logo").forEach(link => {
    link.href = backUrl.href;
  });
  try {
    if (!id) throw new Error("Aktionsnummer fehlt");
    const response = await fetch("data/actions.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const actions = await response.json();
    const action = actions.find(item => item.url?.split("/").pop() === id);
    if (!action) throw new Error("Aktion nicht gefunden");

    document.title = `${action.title} · Interaktive Aktionsübersicht`;
    document.getElementById("detail-title").textContent = action.title;
    const meta = document.getElementById("detail-meta");
    function addTags(values, type, suffix = "") {
      for (const value of values) {
        const tag = document.createElement("span");
        tag.className = `tag tag-${type}`;
        tag.textContent = `${value}${suffix}`;
        meta.append(tag);
      }
    }
    for (const points of action.points || []) addTags([`${points} ${points === 1 ? "Punkt" : "Punkte"}`], "points");
    if (action.catchup) addTags(["Punkte nachholen"], "catchup");
    addTags((action.teams || []).map(team => teamNames[team] || team), "team");
    if (action.status) addTags([statusNames[action.status] || action.status],
      action.status === "Proposal" ? "status-proposal" : "status");
    if (action.state === "closed") addTags(["Geschlossen"], "closed");
    addTags(action.scopes || [], "scope");
    if (action.term) addTags([`Termin: ${action.term}`], "term");

    const content = document.getElementById("detail-content");
    if (action.details || action.description) {
      renderDescription(content, action.details || action.description, action.url);
    } else {
      content.classList.add("detail-empty");
      renderDescription(content, "## Beschreibung\nIm GitLab-Issue ist keine Beschreibung hinterlegt.", action.url);
    }
    document.getElementById("detail-link").href = action.url;
    document.getElementById("detail-panel").hidden = false;
  } catch (error) {
    console.error(error);
    document.getElementById("detail-title").textContent = "Aktion nicht gefunden";
    document.getElementById("detail-error").hidden = false;
  }
}

showAction();
