misty.Debug("Starting skill - Pokedex");

// Setup skill
misty.UnregisterAllEvents();
misty.Set(_params.currentPokeId, _params.minPokeId);
displayLoading();

function getPokemonUrl(id) {
  return _params.baseUrl + id;
}

// Initial request
misty.SendExternalRequest("GET", getPokemonUrl(_params.minPokeId));

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

function _SendExternalRequest(data) {
  const status = data.Status;

  if (status === 3) {
    // Success
    const json = JSON.parse(data.Result.ResponseObject.Data);

    // Ensure that current callback matches the pokemon id to display.
    // The id can be different if the user change the id while a request is not completed.
    const id = json.id;
    if (id !== misty.Get(_params.currentPokeId)) {
      return;
    }

    // Display pokemon name
    const pokemonName = json.name;
    misty.DisplayText(pokemonName.toUpperCase());

    // Get the pokemon sprite URL
    const blackWhiteSprites =
      json.sprites.versions["generation-v"]["black-white"];
    const animatedSpriteUrl = blackWhiteSprites.animated["front_default"];

    // Get the first type of the pokemon
    const first_type = json.types[0].type.name;
    misty.Debug("Pokemon type: " + first_type);

    // Download the sprite
    misty.SendExternalRequest(
      "GET",
      animatedSpriteUrl,
      null,
      null,
      "{}",
      true, // Save to local storage
      false, // Once saved, immediately display the image
      `pokedex_${id}.gif`, // Filename
      "image/gif", // The image is a gif file
      "_OnPokeImageReady" // Callback function name to be called
    );
  } else {
    // Error
    misty.Debug(data.ErrorMessage);
  }
}

function _OnPokeImageReady(data) {
  const pokeId = misty.Get(_params.currentPokeId);
  const imageName = `pokedex_${pokeId}.gif`;

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
  const currentPokeId = misty.Get(_params.currentPokeId);

  if (sensorName.includes("Left")) {
    if (currentPokeId === _params.maxPokeId) {
      misty.Set(_params.currentPokeId, _params.minPokeId);
    } else {
      misty.Set(_params.currentPokeId, currentPokeId + 1);
    }
  } else {
    if (currentPokeId === _params.minPokeId) {
      misty.Set(_params.currentPokeId, _params.maxPokeId);
    } else {
      misty.Set(_params.currentPokeId, currentPokeId - 1);
    }
  }

  const updatedId = misty.Get(_params.currentPokeId);

  displayLoading();

  misty.SendExternalRequest("GET", getPokemonUrl(updatedId));
}

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
