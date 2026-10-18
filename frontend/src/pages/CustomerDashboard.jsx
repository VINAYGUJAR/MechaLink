
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [address, setAddress] = useState("");
  const [savedAddress, setSavedAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
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
        const saved = locationResult.value.data.address || "";
        setAddress(saved);
        setSavedAddress(saved);
      } else if (locationResult.reason?.response?.status === 404) {
        setAddress("");
        setSavedAddress("");
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
    setSavingAddress(true);

    try {
      const response = await api.put("/customer-location/me", {
        address: address.trim(),
      });

      const confirmedAddress = response.data.address || address.trim();

      setAddress(confirmedAddress);
      setSavedAddress(confirmedAddress);
      setSuccess("Breakdown address saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save the address. Check the address and try again."
      );
    } finally {
      setSavingAddress(false);
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
              Enter an address where you usually need roadside assistance.
              You can update it when needed.
            </p>

            <form onSubmit={handleSaveAddress} className="mt-5 space-y-4">
              <div>
                <label htmlFor="address" className="text-sm font-medium">
                  Address
                </label>
                <textarea
                  id="address"
                  required
                  minLength={5}
                  rows={4}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className={inputClass}
                  placeholder="Enter your area, road, city and nearby landmark"
                />
              </div>

              <button
                type="submit"
                disabled={
                  savingAddress ||
                  !address.trim() ||
                  address.trim() === savedAddress
                }
                className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {savingAddress
                  ? "Saving..."
                  : savedAddress && address.trim() === savedAddress
                    ? "Address Saved"
                    : "Save Breakdown Address"}
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
