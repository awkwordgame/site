const State = {
  chosenIndices: new Set(),
  guessesRemaining: 0,
  gameEnded: false,
  currentGame: {},
  showingPlay: false,
  currentMakeGame: {},
  currentGameId: "",
  dailyGameId: ""
};

const WORDS_PER_ROW = 3;
const WORDS_PER_COL = 5;
const WORDS_PER_GAME = WORDS_PER_ROW * WORDS_PER_COL;

function serializeGameV0(game) {
  const {wordListId, wordListIndices, answerIndices, hint} = game;
  const version = Base64.fromNumber(0);
  const _wordListId = Base64.fromNumber(wordListId, 2);
  const _wordListIndices = wordListIndices.map((i) => Base64.fromNumber(i, 2)).join("");
  const answerCount = Base64.fromNumber(answerIndices.length);
  const _answerIndices = answerIndices.map((i) => Base64.fromNumber(i)).join("");

  return rot13(version + _wordListId + _wordListIndices + answerCount + _answerIndices + hint);
}

function serializeGameV1(game) {
  const version = Base64.fromNumber(1);
  const {seed, hint} = game;

  return rot13(version + seed + hint);
}

async function generateRandomGame(seed) {
  const _seed = seed || generateRandomBase64String(6);
  const rng = new Math.seedrandom(_seed);
  const wordListId = 2; // randomize
  const wordListIndices = generateUniqueRandomNumbers(WORDS_PER_GAME, await getWordListSize(wordListId), rng);
  const words = await getWords(wordListId, wordListIndices);
  const answerIndices = generateUniqueRandomNumbers(getRandomInt(2, 5, rng), 15, rng).sort();

  return {
    seed: _seed,
    wordListId: wordListId,
    wordListIndices: wordListIndices,
    words: words,
    answerIndices: answerIndices
  };
}

function loadNewGame(game) {
  State.gameEnded = false;
  State.chosenIndices.clear();
  State.currentGame = game;
  State.currentGameId = game.id;
  const {hint, words, answerIndices} = State.currentGame;
  set("play-hint", `${hint},${answerIndices.length}`);

  if (isDaily(State.currentGameId)) {
    State.currentGame.dailyNumber = getDailyGameNumber();
    set("daily-number", "#" + getDailyGameNumber());
  }

  range(WORDS_PER_GAME).forEach((i) => {
    const cell = $(i);
    cell.innerText = words[i];
    shade(cell, Colors.NOT_CHOSEN);
  });

  if (isHardMode()) {
    State.guessesRemaining = game.answerIndices.length;
    set("guesses", `<b>${State.guessesRemaining}</b> guesses`);
    show("guesses");
  }

  hide("next-game");
  hide("cant-wait");
  hide("cant-wait-q");
  hide("play-submit");
  hide("play-share");
  set("more", "☰");
  showScreen("play");
}

function createBoard(containerId, rows, cols, idFn, clickFn) {
  const container = $(containerId);
  container.style.setProperty("--grid-rows", rows);
  container.style.setProperty("--grid-cols", cols);

  const _idFn = idFn || ((e) => e);
  const _clickFn = clickFn || toggle;

  range(rows * cols).forEach((i) => {
    const cell = document.createElement("div");
    cell.id = _idFn(i);
    cell.addEventListener("click", () => {
      _clickFn(cell);
    });
    container.appendChild(cell).className = "grid-item";
  })
}

function toggle(cell) {
  if (State.gameEnded) {
    return;
  }

  if (isHardMode()) {
    const cellId = Number(cell.id);
    if (State.currentGame.answerIndices.includes(cellId)) {
      shadeWithBorder(cell, Colors.CORRECT);
    } else {
      shadeWithBorder(cell, Colors.CHOSEN);
    }

    State.chosenIndices.add(cellId);
    State.guessesRemaining--;
    set("guesses", `<b>${State.guessesRemaining}</b> guesses`);

    if (State.guessesRemaining === 0) {
      hide("guesses");
      submit();
    }
    return;
  }

  const cellId = Number(cell.id);
  if (State.chosenIndices.has(cellId)) {
    State.chosenIndices.delete(cellId);
    shade(cell, Colors.NOT_CHOSEN);
  } else {
    State.chosenIndices.add(cellId);
    shade(cell, Colors.CHOSEN);
  }

  if (State.chosenIndices.size === State.currentGame.answerIndices.length) {
    show("play-submit");
  } else {
    hide("play-submit");
  }
}

function saveGame(game) {
  game.timestamp = Date.now();
  const games = localStorage.getObj("games");
  games[game.id] = game;
  localStorage.setObj("games", games);
}

async function animateBoard() {
  for (const i of range(WORDS_PER_GAME)) {
    const cell = $(i);
    shade(cell, Colors.CORRECT);
    await sleep(30);
  }

  for (const i of range(WORDS_PER_GAME)) {
    const cell = $(i);
    shade(cell, Colors.CHOSEN);
    await sleep(30);
  }

  for (const i of range(WORDS_PER_GAME)) {
    const cell = $(i);
    shade(cell, Colors.NOT_CHOSEN);
    await sleep(30);
  }

  await repeat(3, async () => {
    range(WORDS_PER_GAME).forEach((i) => {
      const cell = $(i);
      if (i % 2 === 0) {
        shade(cell, Colors.CORRECT);
      } else {
        shade(cell, Colors.NOT_CHOSEN);
      }
    });
    await sleep(200);

    range(WORDS_PER_GAME).forEach((i) => {
      const cell = $(i);
      if (i % 2 === 1) {
        shade(cell, Colors.CHOSEN);
      } else {
        shade(cell, Colors.NOT_CHOSEN);
      }
    });
    await sleep(200);
  });

  range(WORDS_PER_GAME).forEach((i) => {
    const cell = $(i);
    shade(cell, Colors.NOT_CHOSEN);
  });
  await sleep(200);
}

async function submit() {
  State.gameEnded = true;
  let won = true;
  const chosenIndices = Array.from(State.chosenIndices);

  State.currentGame.answerIndices.forEach((i) => {
    if (!State.chosenIndices.has(i)) {
      won = false;
    }
  })

  if (!isHardMode() || isHardMode() && won) {
    await animateBoard();
    range(WORDS_PER_GAME).forEach((i) => {
      const cell = $(i);
      const chosen = chosenIndices.includes(i);
      const correct = State.currentGame.answerIndices.includes(i);
      if (chosen && correct) {
        shadeWithBorder(cell, Colors.CORRECT);
      } else if (correct) {
        shade(cell, Colors.CORRECT);
      } else if (chosen) {
        shadeWithBorder(cell, Colors.CHOSEN);
      }
    });
  }

  State.currentGame.chosenIndices = chosenIndices.sort();
  State.currentGame.won = won;
  saveGame(State.currentGame);

  hide("play-submit");
  show("play-share");
  showNextGame();
}

function showNextGame() {
  const link = `<span class="pointer" onclick="goTo('https://awkword.co')"><b>play the daily awkword</b></span>`;
  if (isDaily(State.currentGameId)) {
    timer("next-game", "next awkword in", link, () => window.location.reload());
    show("cant-wait");
    show("cant-wait-q");
  } else {
    const games = localStorage.getObj("games");
    if (games[State.dailyGameId]) {
      show("cant-wait");
    } else {
      set("next-game", link);
    }
  }
  show("next-game");
}

function forget() {
  const games = localStorage.getObj("games");
  delete games[State.currentGameId];
  localStorage.setObj("games", games);

  if (State.showingPlay) {
    window.location.reload();
    return;
  }

  history.back();
}

function share(gameId) {
  const games = localStorage.getObj("games");
  const game = games[gameId];
  let url = "https://awkword.co";

  if (!isDaily(gameId)) {
    url += `/?${gameId}`;
  }

  let text;
  let hashtag;
  if (game.made) {
    text = `${game.hint}!`;
    hashtag = "myawkword";
  } else {
    const chosenText = game.chosenIndices.map((e) => {
      return game.words[e];
    }).sort().join(", ");
    text = `${game.hint}! ${chosenText}?`;
    hashtag = "awkword";
  }

  if (!navigator.canShare) {
    text += " \n\n" + url;
    const twitterSharingUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=${hashtag}`;
    window.open(twitterSharingUrl, "_blank");
  } else {
    navigator.share({url: url, text: text, title: text});
  }
}

function getStats(games) {
  let won = 0;
  let played = 0;
  let made = 0;

  games.forEach((game) => {
    if (game.made) {
      made++;
    } else {
      if (game.won) {
        won++;
      }
      played++;
    }
  });

  return {won, played, made};
}

function showHistoryAndUpdateUrl() {
  if (State.showingPlay) {
    showHistory();
    updateUrlHash("?", "history");
    State.showingPlay = false;
  } else {
    history.back();
  }
}

function showHistory() {
  set("more", "◂");
  set("daily-number", "");
  set("history-container", "");

  const container = $("history-container");
  const games = Object.values(localStorage.getObj("games"));

  // stats
  const {won, played, made} = getStats(games);
  set("stats", `<b>${won}</b> won, <b>${played}</b> played, <b>${made}</b> made`);

  // games
  const br = document.createElement("br");
  container.appendChild(br);
  games.sort((a, b) => b.timestamp - a.timestamp).forEach((game) => {
    const answers = game.answerIndices.map((index) => game.words[index]);

    let subtext = "";
    if (game.dailyNumber) {
      subtext = `#${game.dailyNumber}`;
    }
    if (game.won) {
      subtext += ", won";
    } else if (game.made) {
      subtext += "made";
    }

    const cell = document.createElement("div");
    cell.innerHTML = `<div class="history-title">
<span class="history-hint">${game.hint},${game.answerIndices.length}</span><i style="font-size: small;">${subtext}</i>
</div>
<div>${answers.join(", ")}</div>
`;
    cell.addEventListener("click", () => {
      viewGameAndUpdateUrl(game);
    });
    container.appendChild(cell).className = "history-item";
  });
  showScreen("history");
}

function viewCellId(id) {
  return `view${id}`;
}

function viewGameAndUpdateUrl(game) {
  updateUrlHash("?" + game.id, "view", {game});
  viewGame(game);
}

function viewGame(game) {
  State.currentGameId = game.id;

  if (game.dailyNumber) {
    set("daily-number", "#" + game.dailyNumber);
  }
  set("timestamp", getGameTimestamp(game));
  hydrateGame("view-hint", game, viewCellId);
  showScreen("view");
  if (isHardMode() && !game.made) {
    hide("forget");
  } else {
    show("forget");
  }
}

function loadAlreadyPlayedGame(game) {
  State.gameEnded = true;
  State.currentGame = game;
  State.currentGameId = game.id;

  set("more", "☰");
  if (isDaily(State.currentGameId)) {
    set("daily-number", "#" + getDailyGameNumber());
  }
  set("timestamp", getGameTimestamp(game));
  hydrateGame("play-hint", game, (id) => id);
  showNextGame();
  hide("play-submit");
  show("play-share");
  showScreen("play");
  show("status"); // needs to be after showScreen because it's view-screen
  if (isHardMode() && !game.made) {
    hide("forget");
  } else {
    show("forget");
  }
}

function getGameTimestamp(game) {
  if (!game.timestamp) {
    return "";
  }

  const time = timeAgo(game.timestamp);
  let text = "";
  if (game.won) {
    text += "won";
  } else if (game.made) {
    text += "made";
  } else {
    text += "played";
  }
  text += ` <b>${time}</b>`;

  return text;
}

function hydrateGame(hintNodeId, game, cellFn) {
  const {hint, words, answerIndices} = game;
  const chosenIndices = game.chosenIndices || [];
  set(hintNodeId, `${hint},${answerIndices.length}`);

  range(WORDS_PER_GAME).forEach((i) => {
    const cell = $(cellFn(i));
    shade(cell, Colors.NOT_CHOSEN);

    cell.innerText = words[i];

    const chosen = chosenIndices.includes(i);
    const correct = answerIndices.includes(i);
    if (chosen && correct) {
      shadeWithBorder(cell, Colors.CORRECT);
    } else if (correct) {
      if (!isHardMode() || game.made) {
        shade(cell, Colors.CORRECT);
      }
    } else if (chosen) {
      shadeWithBorder(cell, Colors.CHOSEN);
    }
  });
}

function makeCellId(id) {
  return `make${id}`;
}

async function showMakeGameAndUpdateUrl() {
  await showMakeGame();
  updateUrlHash("?", "make");
}

async function showMakeGame() {
  $("make-hint-input").value = "";

  const game = State.currentMakeGame = await generateRandomGame();
  set("make-hint-count", `,${game.answerIndices.length}`);

  range(WORDS_PER_GAME).forEach((i) => {
    const cell = $(makeCellId(i));
    shade(cell, Colors.NOT_CHOSEN);
    cell.innerText = game.words[i];

    if (game.answerIndices.includes(i)) {
      shade(cell, Colors.CORRECT);
    }
  });

  showScreen("make");

  // hide the share button until the user inputs a hint
  hide("make-share");
}

function makeAndShare() {
  State.currentMakeGame.hint = $("make-hint-input").value;
  const gameId = serializeGameV1(State.currentMakeGame);

  State.currentMakeGame.id = gameId;
  State.currentMakeGame.made = true;
  delete State.currentMakeGame.wordListIndices;
  saveGame(State.currentMakeGame);

  share(gameId);
  history.back();
}

function deserializeGame(rawGameId) {
  const gameId = rot13(rawGameId);
  const version = Base64.toNumber(gameId.substring(0, 1));

  if (version === 0) {
    return deserializeGameV0(rawGameId, gameId);
  } else if (version === 1) {
    return deserializeGameV1(rawGameId, gameId);
  }
}

async function deserializeGameV0(rawGameId, gameId) {
  const wordListId = Base64.toNumber(gameId.substring(1, 3));
  const wordListIndices = range(WORDS_PER_GAME).map((i) => Base64.toNumber(gameId.substring(3 + i * 2, 5 + i * 2)));
  const answerCount = Base64.toNumber(gameId.substring(33, 34));
  const answerIndices = range(answerCount).map((i) => Base64.toNumber(gameId.substring(34 + i, 35 + i)));
  const hint = gameId.substring(34 + answerCount);

  return {
    id: rawGameId,
    hint: hint,
    words: await getWords(wordListId, wordListIndices),
    answerIndices: answerIndices
  };
}

async function deserializeGameV1(rawGameId, gameId) {
  const seed = gameId.substring(1, 7);
  const {words, answerIndices} = await generateRandomGame(seed);
  const hint = gameId.substring(7);

  return {
    id: rawGameId,
    hint: hint,
    words: words,
    answerIndices: answerIndices
  };
}

async function getWordListSize(wordListId) {
  const wordList = await getWordList(wordListId);
  return wordList.length;
}

function getWords(wordListId, indices) {
  return getWordList(wordListId).then((wordList) => {
    return indices.map((i) => wordList[i]);
  });
}

function getWordList(wordListId) {
  const key = "wordlist" + wordListId;
  return loadScript(`${key}.js`).then(() => {
    return localStorage.getObj(key);
  });
  // if (localStorage.getObjWithoutDefault(key)) {
  //   return Promise.resolve(localStorage.getObj(key));
  // } else {
  //   return loadScript(`${key}.js`).then(() => {
  //     return localStorage.getObj(key);
  //   });
  // }
}

function getDailyGameNumber() {
  const birthday = (new Date("08/20/2022")).getTime();
  const now = (new Date()).getTime();
  return Math.floor((now - birthday) / (1000 * 3600 * 24));
}

function getDailyGameId() {
  // TODO: decide on how to cache
  const key = "daily";
  return loadScript(`${key}.js`).then(() => {
    const dailyGames = localStorage.getObj(key);
    return dailyGames[getDailyGameNumber()];
  });
}

function clearHistory() {
  localStorage.clear();
  localStorage.setObj("modalShown", true)
  window.location.reload();
}

function toggleDarkMode() {
  // closeModal(); - doesn't work
  $("modal").style.display = "none";
}

function showScreen(screen) {
  const allScreens = ["play", "history", "view", "make"];

  allScreens.forEach((s) => {
    const nodeList = document.querySelectorAll(`.${s}-screen`);
    Array.from(nodeList).forEach((el) => {
      el.classList.add("hidden");
    })
  });

  const nodeList = document.querySelectorAll(`.${screen}-screen`);
  Array.from(nodeList).forEach((el) => {
    el.classList.remove("hidden");
  });
}

window.addEventListener("load", async function () {
  createBoard("play-board", WORDS_PER_COL, WORDS_PER_ROW);
  createBoard("view-board", WORDS_PER_COL, WORDS_PER_ROW, viewCellId, () => null);
  createBoard("make-board", WORDS_PER_COL, WORDS_PER_ROW, makeCellId, () => null);

  // dynamically sized hint input during game making
  const input = $("make-hint-input");
  input.addEventListener("input", resizeInput);
  resizeInput.call(input);

  function resizeInput() {
    let length = 4;
    if (this.value.length > 4) {
      length = this.value.length;
    }
    this.style.width = Math.max(length, 10) + "ch";
  }

  $("make-hint-input").addEventListener('input', () => {
    const hint = $("make-hint-input").value.trim();
    if (hint !== "") {
      show("make-share");
    } else {
      hide("make-share");
    }
  });

  if (isHardMode()) {
    $("hardmode").style.fontWeight = "bold";
  }

  await initializePlayAndUpdateUrl();
})

function initializePlayAndUpdateUrl() {
  return initializePlay().then((gameId) => {
    // TODO: unnecessary?
    if (isDaily(gameId)) {
      history.replaceState({page: "play"}, "", "");
    } else {
      history.replaceState({page: "play"}, "", "?" + gameId);
    }
  });
}

async function initializePlay() {
  State.showingPlay = true;
  let gameId = State.dailyGameId = await getDailyGameId();
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Array.from(urlSearchParams.keys());
  if (params.length > 0) {
    gameId = params[0];
  }

  const games = localStorage.getObj("games");
  if (games[gameId]) {
    await loadAlreadyPlayedGame(games[gameId]);
  } else {
    await deserializeGame(gameId).then((game) => loadNewGame(game));
  }
  return gameId;
}

function isDaily(gameId) {
  return State.dailyGameId === gameId;
}

function isHardMode() {
  return localStorage.getObjWithoutDefault("hardmode") || false;
}

function toggleHardMode() {
  localStorage.setObj("hardmode", !isHardMode());
  window.location.reload();
}

window.addEventListener('popstate', async (event) => {
  // console.log(`location: ${document.location}, state: ${JSON.stringify(event.state)}`);
  if (!event.state || event.state.page === "play") {
    initializePlay();
  } else if (event.state.page === "history") {
    showHistory();
    State.showingPlay = false;
  } else if (event.state.page === "view") {
    viewGame(event.state.game);
  } else if (event.state.page === "make") {
    await showMakeGame();
  }
});
