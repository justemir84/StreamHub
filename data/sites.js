export const SITES = [
  { id: "cinemacity", name: "CinemaCity", url: "https://cinemacity.cc", category: "Movies & Shows" },
  { id: "dizipal", name: "DiziPal", url: "https://dizipal13.com.tr", category: "Movies & Shows" },
  { id: "filmmakinesi", name: "FilmMakinesi", url: "https://filmmakinesi.to", category: "Movies & Shows" },
  { id: "fullhdfilmizlesene", name: "FullHDFilmizlesene", url: "https://www.fullhdfilmizlesene.now", category: "Movies & Shows" },
  { id: "dizibox", name: "DiziBox", url: "https://www.dizibox.live", category: "Movies & Shows" },
  { id: "tbcpl", name: "TBCPL", url: "https://tbcpl.lol", category: "Index" }
];

// Site-bazli login seçicileri (fallback: generic)
export const LOGIN_SELECTORS = {
  cinemacity: {
    username: ['input[name="username"]', 'input[name="email"]', 'input[type="email"]', 'input#username', 'input#email', 'input[name="login"]'],
    password: ['input[name="password"]', 'input[type="password"]', 'input#password', 'input[name="pass"]'],
    submit: ['button[type="submit"]', 'input[type="submit"]', 'button.login', 'button.btn-login', 'button.btn', 'button']
  },
  dizipal: {
    username: ['input#login', 'input[name="login"]', 'input[name="email"]', 'input[type="email"]', 'input[name="username"]'],
    password: ['input#password', 'input[name="password"]', 'input[type="password"]'],
    submit: ['button[type="submit"]', 'input[type="submit"]', 'button.btn', 'button.login', 'button']
  },
  fullhdfilmizlesene: {
    username: ['input[name="username"]', 'input[name="email"]', 'input[type="email"]', 'input[name="login"]'],
    password: ['input[name="password"]', 'input[type="password"]'],
    submit: ['button[type="submit"]', 'input[type="submit"]', 'button.btn', 'button']
  },
  dizibox: {
    username: ['input[name="log"]', 'input[name="username"]', 'input[type="text"]', 'input#user_login'],
    password: ['input[name="pwd"]', 'input[name="password"]', 'input[type="password"]'],
    submit: ['button[type="submit"]', 'input[type="submit"]', 'button#wp-submit', 'button']
  },
  filmmakinesi: {
    username: ['input[name="username"]', 'input[name="email"]', 'input[type="email"]', 'input#username'],
    password: ['input[name="password"]', 'input[type="password"]', 'input#password'],
    submit: ['button[type="submit"]', 'input[type="submit"]', 'button.btn', 'button']
  },
  generic: {
    username: ['input[type="email"]', 'input[name*="mail"]', 'input[name*="user"]', 'input[name*="login"]', 'input[id*="user"]', 'input[id*="email"]'],
    password: ['input[type="password"]', 'input[name*="pass"]', 'input[id*="pass"]'],
    submit: ['button[type="submit"]', 'input[type="submit"]', 'button.btn', 'button.login']
  }
};

export function getSelectors(siteId) {
  return LOGIN_SELECTORS[siteId] || LOGIN_SELECTORS.generic;
}