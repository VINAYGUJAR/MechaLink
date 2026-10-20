export function getCurrentBrowserLocation(
  geolocation = globalThis.navigator?.geolocation
) {
  if (!geolocation) {
    return Promise.reject(
      new Error("This browser does not support location access.")
    );
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords || {};

        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          reject(new Error("Your browser returned invalid location coordinates."));
          return;
        }

        resolve({ latitude, longitude });
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}
