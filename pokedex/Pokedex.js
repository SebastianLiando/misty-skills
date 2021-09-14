misty.Debug("Starting skill - Pokedex");

// Setup skill
misty.UnregisterAllEvents();
misty.DisplayText("");
misty.DisplayImage("e_DefaultContent.jpg");
misty.Set(_params.currentPokeId, _params.minPokeId);

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

  // TODO: Change default image layer scaling settings
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

  // Display loading animation
  misty.DisplayImage("a_Loading.gif");
  misty.DisplayText("Loading");

  misty.SendExternalRequest("GET", getPokemonUrl(updatedId));
}
