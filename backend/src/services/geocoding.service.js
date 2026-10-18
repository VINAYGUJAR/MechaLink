
async function geocodeAddress(address) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    throw new Error("GEOAPIFY_API_KEY is missing from .env");
  }

  const params = new URLSearchParams({
    text: address,
    filter: "countrycode:in",
    limit: "1",
    format: "json",
    apiKey,
  });

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/search?${params}`
  );

  if (!response.ok) {
    throw new Error("Address lookup service failed");
  }

  const data = await response.json();
  const result = data.results?.[0];

  if (!result) {
    return null;
  }

  return {
    formattedAddress: result.formatted,
    longitude: result.lon,
    latitude: result.lat,
  };
}

module.exports = geocodeAddress;
