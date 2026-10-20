
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  getPlaceDetails,
  isPlacesSearchConfigured,
  searchPlaces,
} from "../utils/places";

const SERVICES = [
  "Engine Repair",
  "Oil Change",
  "Brake Repair",
  "Battery Service",
  "Tyre Repair",
  "Electrical Repair",
  "General Service",
];

const EMPTY_PROFILE = {
  garageName: "",
  description: "",
  services: [],
  garageAddress: "",
  verificationStatus: "pending",
};

function getProfile(data) {
  return data?.profile || data?.mechanic || data?.data || data;
}

function getRequests(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getId(item) {
  return item?._id || item?.id;
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    accepted: "bg-blue-100 text-blue-800",
    in_progress: "bg-violet-100 text-violet-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  maxLength,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}{required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function GarageProfileForm({ onSave, saving, onCancel }) {
  const [garageName, setGarageName] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  function toggleService(service) {
    setServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service]
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!garageName.trim()) {
      setError("Please enter your garage name.");
      return;
    }

    if (services.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    try {
      await onSave({
        garageName: garageName.trim(),
        description: description.trim(),
        services,
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create your garage profile."
      );
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Create garage profile
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your garage details. You can add your location after creating
            your profile.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-5 space-y-5">
        <Field
          name="garageName"
          label="Garage name"
          value={garageName}
          onChange={(event) => setGarageName(event.target.value)}
          placeholder="Example: Vinay Auto Care"
          required
          maxLength={100}
        />

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Garage description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Describe your garage and experience."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Services offered *
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((service) => (
              <label
                key={service}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                  services.includes(service)
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={services.includes(service)}
                  onChange={() => toggleService(service)}
                  className="h-4 w-4 accent-blue-600"
                />
                {service}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Creating profile..." : "Create garage profile"}
        </button>
      </form>
    </section>
  );
}

function GarageLocationForm({
  currentAddress,
  onSave,
  saving,
  onCancel,
}) {
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");

  useEffect(() => {
    const query = searchText.trim();

    if (query.length < 3 || selectedLocation?.formattedAddress === query) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setLookupMessage("");

      try {
        const results = await searchPlaces(query);
        if (!cancelled) {
          setSuggestions(results);
          if (results.length === 0) {
            setLookupMessage("No matching addresses found. Keep typing to search.");
          }
        }
      } catch (searchError) {
        if (!cancelled) {
          setSuggestions([]);
          setLookupMessage(searchError.message || "Address suggestions are unavailable.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchText, selectedLocation]);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!selectedLocation) {
      setError("Select a Google Maps address suggestion before saving.");
      return;
    }

    try {
      await onSave(selectedLocation);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update the garage location. Please try again."
      );
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Update garage location
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Search for your garage and select a Google Maps suggestion to save
            its address and coordinates.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {currentAddress && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Currently saved address
          </p>
          <p className="mt-2 text-sm text-slate-800">{currentAddress}</p>
        </div>
      )}

      {!isPlacesSearchConfigured() && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Add VITE_GOOGLE_MAPS_API_KEY or VITE_GEOAPIFY_API_KEY to the frontend
          .env file to enable location search.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-5 space-y-5">
        <div>
          <label
            htmlFor="garage-location-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Search garage address
          </label>
          <input
            id="garage-location-search"
            type="search"
            autoComplete="off"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              setSelectedLocation(null);
              setSuggestions([]);
              setError("");
              setLookupMessage("");
              setSearching(false);
            }}
            placeholder="Type an address and select a suggestion"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {searching && (
          <p className="text-sm text-slate-500">
            Searching for address suggestions...
          </p>
        )}

        {lookupMessage && (
          <p className="text-sm text-slate-600">{lookupMessage}</p>
        )}

        {suggestions.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <p className="bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Choose an address suggestion
            </p>

            {suggestions.map((suggestion, index) => (
              <button
                type="button"
                key={`${suggestion.description}-${index}`}
                onClick={async () => {
                  setSearching(true);
                  setLookupMessage("");
                  setError("");

                  try {
                    const place = await getPlaceDetails(
                      suggestion.prediction,
                      suggestion.provider
                    );
                    setSelectedLocation(place);
                    setSearchText(place.formattedAddress);
                    setSuggestions([]);
                    setLookupMessage("Address selected.");
                  } catch (selectionError) {
                    setLookupMessage(
                      selectionError.message ||
                        "Could not load the selected address."
                    );
                  } finally {
                    setSearching(false);
                  }
                }}
                className="flex w-full gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm text-slate-700 hover:bg-blue-50"
              >
                <span aria-hidden="true">⌖</span>
                <span>{suggestion.description}</span>
              </button>
            ))}
          </div>
        )}

        {selectedLocation && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="font-semibold text-slate-800">
              {selectedLocation.name}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedLocation.formattedAddress}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Address preview
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-800">
            {selectedLocation?.formattedAddress ||
              "Select an address suggestion to preview your garage location."}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !selectedLocation}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Updating location..." : "Update garage location"}
        </button>
      </form>
    </section>
  );
}

function VerificationCard({ profile }) {
  const status = profile?.verificationStatus || "pending";

  const details = {
    pending: {
      title: "Verification pending",
      description:
        "Your garage is waiting for an administrator to review it. You cannot receive customer requests until your garage is approved.",
      style: "border-amber-200 bg-amber-50",
    },
    approved: {
      title: "Garage approved",
      description:
        "Your garage is approved. You can receive customer assistance requests.",
      style: "border-emerald-200 bg-emerald-50",
    },
    rejected: {
      title: "Garage rejected",
      description:
        "Your garage has not been approved. Contact the administrator if you need details about the decision.",
      style: "border-red-200 bg-red-50",
    },
  };

  const current = details[status] || details.pending;

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${current.style}`}>
      <p className="text-sm font-semibold text-slate-600">
        Garage verification
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-slate-900">{current.title}</h2>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {current.description}
      </p>
    </section>
  );
}

function RequestCard({ request, onAccept, onUpdateStatus, busy }) {
  const customer = request.customerId || request.customer || {};
  const vehicle = request.vehicleId || request.vehicle || {};

  const customerName =
    customer.name || customer.fullName || customer.email || "Customer";

  const vehicleName = [
    vehicle.make || vehicle.brand,
    vehicle.model,
    vehicle.registrationNumber || vehicle.licensePlate,
  ]
    .filter(Boolean)
    .join(" ");

  const status = request.status || "pending";
  const requestId = getId(request);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {customerName}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {vehicleName || "Vehicle details not available"}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer's problem
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {request.description || "No description provided"}
          </p>
        </div>

        {customer.phone && (
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Phone:</span> {customer.phone}
          </p>
        )}

        {request.createdAt && (
          <p className="text-sm text-slate-500">
            Requested: {new Date(request.createdAt).toLocaleString()}
          </p>
        )}

        <div className="pt-2">
          {status === "pending" && (
            <button
              type="button"
              disabled={busy || !requestId}
              onClick={() => onAccept(requestId)}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? "Updating..." : "Accept customer request"}
            </button>
          )}

          {status === "accepted" && (
            <button
              type="button"
              disabled={busy || !requestId}
              onClick={() => onUpdateStatus(requestId, "in_progress")}
              className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {busy ? "Updating..." : "Start repair"}
            </button>
          )}

          {status === "in_progress" && (
            <button
              type="button"
              disabled={busy || !requestId}
              onClick={() => onUpdateStatus(requestId, "completed")}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Updating..." : "Mark repair completed"}
            </button>
          )}

          {status === "completed" && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              This repair is completed.
            </p>
          )}

          {status === "cancelled" && (
            <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
              This request has been cancelled.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MechanicDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState(null);

  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    const response = await api.get("/mechanics/me");
    const result = getProfile(response.data);

    if (!result || typeof result !== "object" || !result.garageName) {
      setProfile(null);
      return null;
    }

    const normalized = {
      ...EMPTY_PROFILE,
      ...result,
      services: Array.isArray(result.services) ? result.services : [],
    };

    setProfile(normalized);
    return normalized;
  }, []);

  const loadRequests = useCallback(async () => {
    const response = await api.get("/mechanics/assistance-requests");
    setRequests(getRequests(response.data));
  }, []);

  const refreshDashboard = useCallback(async () => {
    setError("");

    let currentProfile;

    try {
      currentProfile = await loadProfile();
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null);
        setRequests([]);
        return;
      }
      throw err;
    }

    if (!currentProfile) {
      setRequests([]);
      return;
    }

    if (currentProfile.verificationStatus === "approved") {
      try {
        await loadRequests();
      } catch (err) {
        setRequests([]);
        setError(
          err.response?.data?.message ||
            "Your profile loaded, but requests could not be loaded."
        );
      }
    } else {
      setRequests([]);
    }
  }, [loadProfile, loadRequests]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);

      try {
        await refreshDashboard();
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load the dashboard. Please check your connection and try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [refreshDashboard]);

  function handleSignOut() {
    // Force a full-page navigation so authentication context is reinitialized.
    // Remove common token keys without deleting unrelated application data.
    const authKeys = [
      "token",
      "authToken",
      "accessToken",
      "user",
      "authUser",
    ];

    authKeys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    window.location.assign("/login");
  }

  async function handleCreateProfile(payload) {
    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/mechanics/me", payload);
      const result = getProfile(response.data);

      if (result && typeof result === "object" && result.garageName) {
        setProfile({
          ...EMPTY_PROFILE,
          ...result,
          services: Array.isArray(result.services) ? result.services : [],
        });
      } else {
        await loadProfile();
      }

      setShowCreateForm(false);
      setShowLocationForm(true);
      setSuccess(
        "Garage profile created. Add your garage location to finish setup."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create your garage profile."
      );
      throw err;
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdateLocation(location) {
    setSavingLocation(true);
    setError("");
    setSuccess("");

    try {
      // Existing backend route: PATCH /api/mechanics/me/location
      const response = await api.patch("/mechanics/me/location", {
        name: location.name,
        address: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      const savedAddress =
        response.data?.garageAddress || location.formattedAddress;

      setProfile((current) =>
        current
          ? {
              ...current,
              garageAddress: savedAddress,
              location: response.data?.location || current.location,
            }
          : current
      );

      setShowLocationForm(false);
      setSuccess("Garage location updated successfully.");

      // Refresh from the backend so the displayed profile is current.
      try {
        await loadProfile();
      } catch {
        // Keep the successful location update visible even if refresh fails.
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update your garage location."
      );
      throw err;
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    setSuccess("");

    try {
      await refreshDashboard();
      setSuccess("Dashboard refreshed.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not refresh the dashboard."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAccept(requestId) {
    setBusyRequestId(requestId);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/mechanics/assistance-requests/${requestId}/accept`);
      await loadRequests();
      setSuccess("Customer request accepted.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not accept this customer request."
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleUpdateStatus(requestId, status) {
    setBusyRequestId(requestId);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/mechanics/assistance-requests/${requestId}/status`,
        { status }
      );
      await loadRequests();

      setSuccess(
        status === "completed"
          ? "Repair marked as completed."
          : "Repair started."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update the customer request."
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  const counts = useMemo(() => {
    const result = {
      all: requests.length,
      pending: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    requests.forEach((request) => {
      const status = request.status || "pending";
      if (Object.prototype.hasOwnProperty.call(result, status)) {
        result[status] += 1;
      }
    });

    return result;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter(
      (request) => (request.status || "pending") === filter
    );
  }, [requests, filter]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-600">
            Loading mechanic dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Mecalink
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Mechanic dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage verification, your garage location, and customer repairs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {!profile ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Create your garage profile
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You have not created a garage profile yet. Create one to begin
              the administrator verification process.
            </p>

            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setShowLocationForm(false);
                  setError("");
                  setSuccess("");
                }}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create profile
              </button>
            ) : (
              <div className="mt-5">
                <GarageProfileForm
                  onSave={handleCreateProfile}
                  saving={savingProfile}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            )}
          </section>
        ) : (
          <>
            <VerificationCard profile={profile} />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Your garage
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {profile.garageName}
                  </h2>
                  <div className="mt-3">
                    <StatusBadge
                      status={profile.verificationStatus || "pending"}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowLocationForm((current) => !current);
                    setError("");
                    setSuccess("");
                  }}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {showLocationForm
                    ? "Close location form"
                    : "Update garage location"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Garage address
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">
                    {profile.garageAddress || "No garage address saved yet."}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Description
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {profile.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Services offered
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.services.length > 0 ? (
                    profile.services.map((service) => (
                      <span
                        key={service}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                      >
                        {service}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No services listed.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {showLocationForm && (
              <GarageLocationForm
                currentAddress={profile.garageAddress}
                onSave={handleUpdateLocation}
                saving={savingLocation}
                onCancel={() => setShowLocationForm(false)}
              />
            )}

            {profile.verificationStatus === "approved" ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Customer assistance requests
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Accept customer requests, start repairs, and update the
                    status when the repair is finished.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    ["all", "All"],
                    ["pending", "Pending"],
                    ["accepted", "Accepted"],
                    ["in_progress", "In progress"],
                    ["completed", "Completed"],
                    ["cancelled", "Cancelled"],
                  ].map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`rounded-xl border p-3 text-left ${
                        filter === key
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {counts[key]}
                      </p>
                    </button>
                  ))}
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <h3 className="font-semibold text-slate-800">
                      {requests.length === 0
                        ? "No customer requests yet"
                        : "No requests in this category"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {requests.length === 0
                        ? "Requests will appear here when customers choose your garage."
                        : "Select another status filter to view other requests."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {filteredRequests.map((request) => {
                      const requestId = getId(request);

                      return (
                        <RequestCard
                          key={requestId || `${request.status}-${request.createdAt}`}
                          request={request}
                          busy={busyRequestId === requestId}
                          onAccept={handleAccept}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Customer requests are unavailable
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your garage must be approved by an administrator before you
                  can receive customer requests. Your verification status is
                  shown above.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
