misty.Debug("Starting skill - Pokedex");

// Setup skill
misty.UnregisterAllEvents();
misty.Set(_params.currentPokeId, _params.minPokeId);

// Setup cache if not available
if (getPokeCache().Message) {
  misty.Debug("Creating cache");
  misty.Set(_params.pokedexCache, JSON.stringify({}), true);
}

/**
 * Returns the URL to PokeAPI for the given pokemon id.
 * @param {int} id The pokemon id.
 * @returns The PokeAPI URL for the pokemon.
 */
function getPokemonUrl(id) {
  return _params.baseUrl + id;
}

/**
 * Returns the image file name for the given pokemon id.
 * @param {int} id The pokemon id.
 * @returns The image file name for the given pokemon id.
 */
function getPokemonImageName(id) {
  return `pokedex_${id}.gif`;
}

/**
 * Return all pokemon data stored in Misty's local storage.
 * @returns The pokemon data in the cache.
 */
function getPokeCache() {
  return JSON.parse(misty.Get(_params.pokedexCache));
}

/**
 * Returns the pokemon data from cache.
 *
 * @param {int} id The pokemon id.
 * @returns The pokemon data for the given id, or null if it is not in the cache.
 */
function getPokemonFromCache(id) {
  const cache = getPokeCache();
  const cachedIds = Object.keys(cache);

  if (cachedIds.includes(String(id))) {
    misty.Debug(`Found pokemon ${id} is in the cache`);
    return cache[id];
  } else {
    return null;
  }
}

/**
 * Persists the pokemon data in Misty's local storage.
 *
 * @param {int} id The pokemon id.
 * @param {object} pokeData The pokemon data.
 */
function savePokemonToCache(pokeData) {
  // Get the id
  const id = pokeData.id;

  // Get the cache
  const cache = getPokeCache();

  // Save the data for the given id.
  cache[String(id)] = pokeData;
  misty.Set(_params.pokedexCache, JSON.stringify(cache), true);
  misty.Debug(`Saved pokemon ${id} to cache`);
}

function getCurrentPokemonId() {
  return misty.Get(_params.currentPokeId);
}

/**
 * Set current pokemon id to the next pokemon.
 */
function nextPokemon() {
  const currentPokeId = getCurrentPokemonId();

  if (currentPokeId === _params.minPokeId) {
    misty.Set(_params.currentPokeId, _params.maxPokeId);
  } else {
    misty.Set(_params.currentPokeId, currentPokeId - 1);
  }
}

/**
 * Set current pokemon id to the previous pokemon。
 */
function prevPokemon() {
  const currentPokeId = getCurrentPokemonId();

  if (currentPokeId === _params.maxPokeId) {
    misty.Set(_params.currentPokeId, _params.minPokeId);
  } else {
    misty.Set(_params.currentPokeId, currentPokeId + 1);
  }
}

misty.RegisterUserEvent(_params.pokeReadyEvent, true);
misty.RegisterUserEvent(_params.displayTypeEvent, true);

// When the skill starts, display the first pokemon
displayPokemon(_params.minPokeId);

// Listen to bump as a control. Left bump to go previous. Right bump to go next.
misty.AddReturnProperty(_params.bumpEvent, "sensorName");
misty.AddPropertyTest(
  _params.bumpEvent,
  "isContacted",
  "==",
  "true",
  "boolean"
);
misty.RegisterEvent(_params.bumpEvent, "BumpSensor", 300, true);

/**
 * Callback for PokeAPI response.
 * @param {*} data The response data.
 */
function _SendExternalRequest(data) {
  const status = data.Status;

  if (status === 3) {
    misty.Debug("Successfully fetched data from PokeAPI");
    // Success
    const json = JSON.parse(data.Result.ResponseObject.Data);

    // Pokemon id
    const id = json.id;

    // Ensure that current callback matches the pokemon id to display.
    // The id can be different if the user change the id while a request is not completed.
    if (id !== getCurrentPokemonId()) {
      misty.Debug(`The id ${id} is no longer valid, returning`);
      return;
    }

    // Display pokemon name
    const pokemonName = json.name;

    // Get the pokemon sprite URL
    const blackWhiteSprites =
      json.sprites.versions["generation-v"]["black-white"];
    const animatedSpriteUrl = blackWhiteSprites.animated["front_default"];

    // Get the first type of the pokemon
    const types = json.types.map((type) => type.type.name);
    misty.Debug("Pokemon type: " + types);

    const pokeData = {
      id: id,
      name: pokemonName,
      spriteUrl: animatedSpriteUrl,
      type: types,
    };

    misty.TriggerEvent(
      _params.pokeReadyEvent, // Event to trigger
      "external_request", // Source name, this is up to you
      JSON.stringify(pokeData), // The data to be passed to the argument of function
      _params.skillId // Which skill(s) will receive the broadcasts
    );
  } else {
    // Error
    misty.Debug(data.ErrorMessage);
  }
}

function displayPokemon(id) {
  const fromCache = getPokemonFromCache(id);

  // Check the cache if the pokemon data exists
  if (fromCache != null) {
    _OnPokeReady(fromCache);
  } else {
    displayLoading();
    misty.SendExternalRequest("GET", getPokemonUrl(id));
  }
}

function _GetImage(data) {
  const id = getCurrentPokemonId();

  if (data.Status === 3) {
    // There is an image downloaded
    displayPokemonImage(id);
  } else {
    const spriteUrl = getPokemonFromCache(id).spriteUrl;
    // Download the sprite
    misty.SendExternalRequest(
      "GET",
      spriteUrl,
      null,
      null,
      "{}",
      true, // Save to local storage
      false, // Once saved, immediately display the image
      getPokemonImageName(id), // Filename
      "image/gif", // The image is a gif file
      "_OnPokeImageReady" // Callback function name to be called
    );
  }
}

function _OnPokeReady({ id, name, spriteUrl, type }) {
  savePokemonToCache({ id, name, spriteUrl, type });

  // Display the pokemon name
  misty.DisplayText(name.toUpperCase());

  // Change the LED based on the pokemon type
  misty.TriggerEvent(_params.displayTypeEvent, "", "{}", _params.skillId);

  // Display the pokemon image
  const imageName = getPokemonImageName(id);
  misty.GetImage(imageName);
}

function _OnPokeImageReady(data) {
  const pokeId = getCurrentPokemonId();
  displayPokemonImage(pokeId);
}

function displayPokemonImage(id) {
  const imageName = getPokemonImageName(id);

  // Change scaling so that the image doesn't get cropped
  misty.SetImageDisplaySettings(
    null,
    false,
    false,
    true,
    1.0,
    480, // Width
    272, // Height
    "Uniform", // Preserve aspect ratio, fill the layer
    false, // Place on top
    0, // Rotation
    "Center", // Horizontal alignment
    "Bottom" // Vertical alignment
  );
  misty.DisplayImage(imageName);
}

function _OnBump(data) {
  const sensorName = data.AdditionalResults[0];

  // Check which bump sensor is activated.
  if (sensorName.includes("Left")) {
    prevPokemon();
  } else {
    nextPokemon();
  }

  // Get the new id
  const updatedId = getCurrentPokemonId();
  displayPokemon(updatedId);
}

/**
 * Display loading state to the user.
 */
function displayLoading() {
  // Reset the layer settings
  misty.SetImageDisplaySettings(null, true);
  // Display loading animation
  misty.DisplayImage("a_Loading.gif");
  misty.DisplayText("Loading");
}

/**
 * Returns the RGB color for the pokemon type. Source: https://www.epidemicjohto.com/t882-type-colors-hex-colors
 *
 * @param {String} type The pokemon type
 * @returns An array with 3 element: r, g, b color if the type is valid, else null.
 */
function getTypeColor(type) {
  switch (type.toLowerCase()) {
    case "normal":
      return [168, 167, 122];
    case "fire":
      return [238, 129, 43];
    case "grass":
      return [122, 199, 76];
    case "water":
      return [99, 144, 240];
    case "electric":
      return [247, 208, 44];
    case "ice":
      return [150, 217, 214];
    case "fighting":
      return [194, 46, 40];
    case "poison":
      return [163, 62, 161];
    case "ground":
      return [226, 191, 101];
    case "flying":
      return [169, 143, 243];
    case "psychic":
      return [249, 85, 135];
    case "bug":
      return [166, 185, 26];
    case "rock":
      return [182, 161, 54];
    case "ghost":
      return [115, 87, 151];
    case "dragon":
      return [111, 53, 252];
    case "dark":
      return [112, 87, 70];
    case "steel":
      return [183, 183, 206];
    case "fairy":
      return [214, 133, 173];
    default:
      return null;
  }
}

/**
 * Display the pokemon type to the user.
 * @param {number} id The pokemon id
 * @param {boolean} second `true` if displaying the pokemon's second type. `false` if displaying the pokemon's first type.
 */
function displayPokemonType(id, second) {
  const pokeData = getPokemonFromCache(id);

  if (pokeData) {
    const type = pokeData.type;
    let [r, g, b] = getTypeColor(type[0]);

    if (second && type.length === 2) {
      [r, g, b] = getTypeColor(type[1]);
    }

    misty.ChangeLED(r, g, b);
  }
}

function _OnDisplayPokemonType(data) {
  // Stop any ongoing color change
  misty.UnregisterEvent("TimerFirst");
  misty.UnregisterEvent("TimerSecond");

  // Display the first type color
  displayPokemonType(getCurrentPokemonId(), false);

  // Start color change
  misty.RegisterTimerEvent(_params.secondTypeEvent, 1000, false);
}

function _TypeFirst(data) {
  // Display the pokemon's first type
  displayPokemonType(getCurrentPokemonId(), false);

  // Start timer to display the second type
  misty.RegisterTimerEvent(_params.secondTypeEvent, 1000, false);
}

function _TypeSecond(data) {
  // Display the pokemon's second type if any
  displayPokemonType(getCurrentPokemonId(), true);

  // Start timer to display the first type
  misty.RegisterTimerEvent(_params.firstTypeEvent, 1000, false);
}
