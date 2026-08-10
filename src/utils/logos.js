const BROADCASTER_DOMAINS = {
  "tvri sport": "tvri.go.id",
  "tvri": "tvri.go.id",
  "rcti": "rcti.tv",
  "vidio": "vidio.com",
  "espn": "espn.com",
  "sctv": "sctv.co.id",
  "indosiar": "indosiar.com",
  "trans7": "trans7.co.id",
  "trans tv": "transtv.co.id",
  "mola tv": "mola.tv",
  "bein sports": "beinsports.com",
  "tvone": "tvonenews.com",
  "net tv": "netmedia.co.id",
  "kompas tv": "kompas.tv",
  "spotv now": "spotvnow.com",
  "spotv": "spotv.com",
  "spotv 2": "spotv.com",
};

export function makeLogoLookup(customLogos) {
  return function lookupBroadcasterLogo(name) {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    if (customLogos && customLogos[key]) return customLogos[key];
    const domain = BROADCASTER_DOMAINS[key];
    return domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null;
  };
}
