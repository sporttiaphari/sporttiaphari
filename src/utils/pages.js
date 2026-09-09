export const PAGE_DAILY = "daily";
export const PAGE_MAJOR = "major";

export function pageFromHash() {
  const raw = (window.location.hash || "").replace(/^#/, "").replace(/^\//, "");
  const path = raw.split("?")[0].split("/")[0].toLowerCase();
  if (path === "major" || path === "event-besar" || path === "besar") return PAGE_MAJOR;
  return PAGE_DAILY;
}

export function hashForPage(page) {
  return page === PAGE_MAJOR ? "#/major" : "#/";
}

export function kvKeys(page) {
  if (page === PAGE_MAJOR) {
    return {
      events: "major_events",
      eventLogos: "major_eventLogos",
      sports: "major_sports",
    };
  }
  return {
    events: "events",
    eventLogos: "eventLogos",
    sports: "sports",
  };
}
