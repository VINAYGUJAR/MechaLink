
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getCurrentBrowserLocation } from "../utils/browserLocation";
import {
  getPlaceDetails,
  searchPlaces,
} from "../utils/places";

function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [savedAddress, setSavedAddress] = useState("");
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [vehicleForm, setVehicleForm] = useState({
    make: "",
    model: "",
    year: "",
    registrationNumber: "",
    vehicleType: "car",
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [vehicleResult, locationResult] = await Promise.allSettled([
        api.get("/vehicles"),
        api.get("/customer-location/me"),
      ]);

      if (vehicleResult.status === "fulfilled") {
        setVehicles(vehicleResult.value.data.vehicles || []);
      } else {
        throw new Error("Could not load your vehicles.");
      }

      if (locationResult.status === "fulfilled") {
        const data = locationResult.value.data;
        const saved = data.formattedAddress || data.address || "";
        const coordinates = data.location?.coordinates;
        setLocationSearch(saved);
        setSavedAddress(saved);
        setSelectedLocation(
          Array.isArray(coordinates) &&
            Number.isFinite(coordinates[0]) &&
            Number.isFinite(coordinates[1])
            ? {
                name: data.name || saved,
                formattedAddress: saved,
                longitude: coordinates[0],
                latitude: coordinates[1],
              }
            : null
        );
      } else if (locationResult.reason?.response?.status === 404) {
        setLocationSearch("");
        setSavedAddress("");
        setSelectedLocation(null);
      } else {
        throw new Error("Could not load your saved breakdown address.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not load your dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const query = locationSearch.trim();

    if (query.length < 3 || selectedLocation?.formattedAddress === query) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingLocations(true);
      setLocationSearchError("");

      try {
        const suggestions = await searchPlaces(query);
        if (!cancelled) setLocationSuggestions(suggestions);
      } catch (searchError) {
        if (!cancelled) {
          setLocationSuggestions([]);
          setLocationSearchError(
            searchError.message || "Address suggestions are unavailable."
          );
        }
      } finally {
        if (!cancelled) setSearchingLocations(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [locationSearch, selectedLocation]);

  function handleVehicleChange(event) {
    setVehicleForm({
      ...vehicleForm,
      [event.target.name]: event.target.value,
    });
  }

  async function handleAddVehicle(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSavingVehicle(true);

    try {
      const response = await api.post("/vehicles", {
        ...vehicleForm,
        year: Number(vehicleForm.year),
      });

      const newVehicle = response.data.vehicle;

      if (newVehicle) {
        setVehicles((current) => [...current, newVehicle]);
      } else {
        await loadDashboard();
      }

      setVehicleForm({
        make: "",
        model: "",
        year: "",
        registrationNumber: "",
        vehicleType: "car",
      });

      setSuccess("Vehicle added successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not add your vehicle."
      );
    } finally {
      setSavingVehicle(false);
    }
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedLocation) {
      setError("Choose a suggested address or use your current location first.");
      return;
    }

    setSavingAddress(true);

    try {
      const response = await api.put("/customer-location/me", {
        name: selectedLocation.name,
        formattedAddress: selectedLocation.formattedAddress,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });

      const confirmedAddress =
        response.data.formattedAddress ||
        response.data.address ||
        selectedLocation.formattedAddress;
      setLocationSearch(confirmedAddress);
      setSavedAddress(confirmedAddress);
      setSelectedLocation({
        ...selectedLocation,
        name: response.data.name || selectedLocation.name,
        formattedAddress: confirmedAddress,
      });
      setLocationSuggestions([]);
      setSuccess("Breakdown address saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not save the selected location."
      );
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleUseCurrentLocation() {
    setError("");
    setSuccess("");
    setLocationSearchError("");
    setSearchingLocations(false);

    setGettingCurrentLocation(true);

    try {
      const { latitude, longitude } = await getCurrentBrowserLocation();

      const currentLocation = {
        name: "Current location",
        formattedAddress: "Current location",
        latitude,
        longitude,
      };
      setSelectedLocation(currentLocation);
      setLocationSearch("Current location");
      setLocationSuggestions([]);
      setSuccess("Current location selected. Save it to find nearby mechanics.");
    } catch (locationError) {
      const messages = {
        1: "Location permission was denied. Allow location access in your browser and try again.",
        2: "Your current location is unavailable. Check your device location settings and try again.",
        3: "The location request timed out. Please try again.",
      };
      setError(
        messages[locationError.code] ||
          locationError.message ||
          "Could not retrieve your current location."
      );
    } finally {
      setGettingCurrentLocation(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">Mecalink</h1>
            <p className="text-sm text-slate-500">Customer Dashboard</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* Welcome section */}
        <section className="rounded-2xl bg-blue-700 p-6 text-white">
          <p className="text-sm text-blue-100">Welcome back</p>

          <h2 className="mt-1 text-2xl font-bold">
            {user?.name || "Customer"}
          </h2>

          <p className="mt-2 text-sm text-blue-100">
            Manage your vehicles and breakdown location.
          </p>

          {/* Find Nearby Mechanics button */}
          <Link
            to="/customer/mechanics"
            className="mt-5 inline-flex rounded-lg bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
          >
            Find Nearby Mechanics
          </Link>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            {error.toLowerCase().includes("token") ||
            error.toLowerCase().includes("unauthorized") ? (
              <button
                onClick={handleLogout}
                className="ml-2 font-semibold underline"
              >
                Sign in again
              </button>
            ) : null}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          {/* Add vehicle */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800">
              Your Vehicles
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add the vehicles you may need assistance with.
            </p>

            <form onSubmit={handleAddVehicle} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="make" className="text-sm font-medium">
                    Make
                  </label>
                  <input
                    id="make"
                    name="make"
                    required
                    value={vehicleForm.make}
                    onChange={handleVehicleChange}
                    className={inputClass}
                    placeholder="e.g. Honda"
                  />
                </div>

                <div>
                  <label htmlFor="model" className="text-sm font-medium">
                    Model
                  </label>
                  <input
                    id="model"
                    name="model"
                    required
                    value={vehicleForm.model}
                    onChange={handleVehicleChange}
                    className={inputClass}
                    placeholder="e.g. City"
                  />
                </div>

                <div>
                  <label htmlFor="year" className="text-sm font-medium">
                    Year
                  </label>
                  <input
                    id="year"
                    name="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                    value={vehicleForm.year}
                    onChange={handleVehicleChange}
                    className={inputClass}
                    placeholder="e.g. 2024"
                  />
                </div>

                <div>
                  <label
                    htmlFor="registrationNumber"
                    className="text-sm font-medium"
                  >
                    Registration Number
                  </label>
                  <input
                    id="registrationNumber"
                    name="registrationNumber"
                    required
                    value={vehicleForm.registrationNumber}
                    onChange={handleVehicleChange}
                    className={inputClass}
                    placeholder="Vehicle registration"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vehicleType" className="text-sm font-medium">
                  Vehicle Type
                </label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  value={vehicleForm.vehicleType}
                  onChange={handleVehicleChange}
                  className={inputClass}
                >
                  <option value="car">Car</option>
                  <option value="bike">Bike</option>
                  <option value="truck">Truck</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingVehicle}
                className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {savingVehicle ? "Adding..." : "Add Vehicle"}
              </button>
            </form>
          </div>

          {/* Breakdown location */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800">
              Breakdown Location
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Use your current location or search for an address. Save the
              selected coordinates to find mechanics within 5 km.
            </p>

            <form onSubmit={handleSaveAddress} className="mt-5 space-y-4">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gettingCurrentLocation || savingAddress}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {gettingCurrentLocation
                  ? "Getting current location..."
                  : "Use Current Location"}
              </button>

              <div className="text-center text-sm font-medium text-slate-400">
                OR
              </div>

              <div>
                <label htmlFor="location-search" className="text-sm font-medium">
                  Search Location
                </label>
                <input
                  id="location-search"
                  type="search"
                  autoComplete="off"
                  value={locationSearch}
                  onChange={(event) => {
                    const query = event.target.value;
                    setLocationSearch(query);
                    setSelectedLocation(null);
                    setLocationSuggestions([]);
                    setLocationSearchError("");
                    setSearchingLocations(query.trim().length >= 3);
                    setError("");
                    setSuccess("");
                  }}
                  className={inputClass}
                  placeholder="Type an address and select a suggestion"
                />
              </div>

              {searchingLocations && (
                <p className="text-sm text-slate-500">Searching locations...</p>
              )}

              {locationSearchError && (
                <p role="alert" className="text-sm text-red-700">
                  {locationSearchError}
                </p>
              )}

              {locationSearch.trim().length >= 3 &&
                !searchingLocations &&
                !locationSearchError &&
                !selectedLocation &&
                locationSuggestions.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No matching locations found. Try a more complete address.
                  </p>
                )}

              {locationSuggestions.length > 0 && (
                <ul className="overflow-hidden rounded-lg border border-slate-200">
                  {locationSuggestions.map((suggestion, index) => (
                    <li key={`${suggestion.description}-${index}`}>
                      <button
                        type="button"
                        onClick={async () => {
                          setLocationSearchError("");
                          setSearchingLocations(true);

                          try {
                            const place = await getPlaceDetails(
                              suggestion.prediction,
                              suggestion.provider
                            );
                            setSelectedLocation(place);
                            setLocationSearch(place.formattedAddress);
                            setLocationSuggestions([]);
                          } catch (selectionError) {
                            setLocationSearchError(
                              selectionError.message ||
                                "Could not load the selected location."
                            );
                          } finally {
                            setSearchingLocations(false);
                          }
                        }}
                        className="w-full border-b border-slate-100 px-3 py-3 text-left text-sm text-slate-700 last:border-0 hover:bg-blue-50"
                      >
                        {suggestion.description}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selectedLocation && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="font-semibold text-slate-800">
                    {selectedLocation.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedLocation.formattedAddress}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedLocation.latitude.toFixed(6)},{" "}
                    {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={savingAddress || !selectedLocation}
                className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {savingAddress ? "Saving..." : "Save Breakdown Location"}
              </button>
            </form>

            {savedAddress && (
              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Saved address
                </p>
                <p className="mt-1 text-sm text-slate-800">{savedAddress}</p>
              </div>
            )}
          </div>
        </section>

        {/* Saved vehicles */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                My Vehicles
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Vehicles saved to your account.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              {vehicles.length} total
            </span>
          </div>

          {vehicles.length === 0 ? (
            <p className="mt-5 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
              No vehicles added yet. Use the form above to add your first
              vehicle.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => (
                <article
                  key={vehicle._id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <h4 className="font-bold text-slate-800">
                    {vehicle.make} {vehicle.model}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Year: {vehicle.year}
                  </p>
                  <p className="text-sm text-slate-500">
                    Registration: {vehicle.registrationNumber}
                  </p>
                  <p className="text-sm capitalize text-slate-500">
                    Type: {vehicle.vehicleType}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CustomerDashboard;
