let placesLibraryPromise;

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

export function isPlacesSearchConfigured() {
  return Boolean(googleMapsApiKey || geoapifyApiKey);
}

function loadGooglePlaces() {
  if (window.google?.maps?.importLibrary) {
    return window.google.maps.importLibrary("places");
  }

  if (!googleMapsApiKey) {
    return Promise.reject(
      new Error("VITE_GOOGLE_MAPS_API_KEY is missing from the frontend environment.")
    );
  }

  if (placesLibraryPromise) return placesLibraryPromise;

  const loading = new Promise((resolve, reject) => {
    const callbackName = `__mechaLinkGoogleMapsLoaded${Date.now()}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      delete window[callbackName];
      reject(new Error("Google Maps could not be loaded. Check the API key and settings."));
    }, 15000);

    window[callbackName] = async () => {
      window.clearTimeout(timeout);
      delete window[callbackName];

      try {
        resolve(await window.google.maps.importLibrary("places"));
      } catch (error) {
        reject(error);
      }
    };

    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      googleMapsApiKey
    )}&v=weekly&loading=async&callback=${callbackName}`;
    script.onerror = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      reject(new Error("Google Maps could not be loaded. Check the API key and settings."));
    };
    document.head.appendChild(script);
  });

  placesLibraryPromise = loading.catch((error) => {
    placesLibraryPromise = undefined;
    throw error;
  });

  return placesLibraryPromise;
}

async function searchGeoapifyPlaces(input) {
  const params = new URLSearchParams({
    text: input,
    apiKey: geoapifyApiKey,
    filter: "countrycode:in",
    lang: "en",
  });
  let response;

  try {
    response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params}`
    );
  } catch {
    throw new Error(
      "Could not connect to Geoapify. Check your internet connection and try again."
    );
  }

  if (!response.ok) {
    let providerMessage = "";
    try {
      const errorBody = await response.json();
      providerMessage = [
        errorBody.message,
        errorBody.error?.message,
        typeof errorBody.error === "string" ? errorBody.error : "",
      ].find((message) => typeof message === "string" && message.trim()) || "";
    } catch {
      // Use the HTTP status message below if Geoapify did not return JSON.
    }

    const details = providerMessage ? ` ${providerMessage}` : "";
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Geoapify rejected the API key (HTTP ${response.status}). Check that VITE_GEOAPIFY_API_KEY is valid and that its API and domain restrictions allow this site.${details}`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `Geoapify rate limit reached (HTTP 429). Check your Geoapify plan and try again later.${details}`
      );
    }

    throw new Error(
      `Geoapify address search failed (HTTP ${response.status}).${details}`
    );
  }

  const result = await response.json();

  return (result.features || [])
    .filter((feature) => feature.properties?.formatted)
    .map((feature) => ({
      description: feature.properties.formatted,
      prediction: feature.properties,
      provider: "geoapify",
    }));
}

export async function searchPlaces(input) {
  if (!googleMapsApiKey && geoapifyApiKey) {
    return searchGeoapifyPlaces(input);
  }

  if (!googleMapsApiKey) {
    throw new Error(
      "Set VITE_GOOGLE_MAPS_API_KEY or VITE_GEOAPIFY_API_KEY in the frontend environment."
    );
  }

  const { AutocompleteSuggestion } = await loadGooglePlaces();
  const result = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    includedRegionCodes: ["in"],
  });

  return (result.suggestions || [])
    .filter((suggestion) => suggestion.placePrediction)
    .map((suggestion) => ({
      description: suggestion.placePrediction.text.toString(),
      prediction: suggestion.placePrediction,
      provider: "google",
    }));
}

export async function getPlaceDetails(prediction, provider = "google") {
  if (provider === "geoapify") {
    const latitude = prediction.lat;
    const longitude = prediction.lon;
    const formattedAddress = prediction.formatted;
    const name =
      prediction.name || prediction.address_line1 || formattedAddress;

    if (
      !name ||
      !formattedAddress ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error("Geoapify did not return a valid location.");
    }

    return { name, formattedAddress, latitude, longitude };
  }

  const place = prediction.toPlace();
  await place.fetchFields({
    fields: ["displayName", "formattedAddress", "location"],
  });

  const latitude = place.location?.lat();
  const longitude = place.location?.lng();
  const name =
    typeof place.displayName === "string"
      ? place.displayName
      : place.displayName?.text;

  if (
    !name ||
    !place.formattedAddress ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error("Google Places did not return a valid location.");
  }

  return {
    name,
    formattedAddress: place.formattedAddress,
    latitude,
    longitude,
  };
}
