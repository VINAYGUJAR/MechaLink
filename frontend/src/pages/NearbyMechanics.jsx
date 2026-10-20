
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { getNearbyMechanicsParams } from "../utils/nearbyMechanics";

function NearbyMechanics() {
  const [mechanics, setMechanics] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [requests, setRequests] = useState([]);

  const [radiusKm, setRadiusKm] = useState("5");
  const [selectedVehicles, setSelectedVehicles] = useState({});
  const [descriptions, setDescriptions] = useState({});

  const [loading, setLoading] = useState(true);
  const [mechanicsLoading, setMechanicsLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState("");
  const [cancellingId, setCancellingId] = useState("");

  const [mechanicsError, setMechanicsError] = useState("");
  const [pageError, setPageError] = useState("");
  const [success, setSuccess] = useState("");

  const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.message || fallback;

  const getArray = (data, key, alternativeKey) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.[key])) return data[key];
    if (alternativeKey && Array.isArray(data?.[alternativeKey])) {
      return data[alternativeKey];
    }
    return [];
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setMechanicsLoading(true);
    setMechanicsError("");
    setPageError("");

    // Load each section independently. If nearby mechanics cannot load,
    // vehicles and existing assistance requests can still be displayed.
    const results = await Promise.allSettled([
      api.get("/customer-location/me"),
      api.get("/vehicles"),
      api.get("/customer/assistance-requests"),
    ]);

    const [locationResult, vehiclesResult, requestsResult] = results;

    if (locationResult.status === "fulfilled") {
      const coordinates =
        locationResult.value.data?.location?.coordinates;

      if (
        !Array.isArray(coordinates) ||
        !Number.isFinite(coordinates[0]) ||
        !Number.isFinite(coordinates[1])
      ) {
        setMechanics([]);
        setMechanicsError(
          "Select a valid location from your customer dashboard before searching."
        );
      } else {
        try {
          const mechanicsResult = await api.get(
            "/customer/mechanics/nearby",
            {
              params: getNearbyMechanicsParams(coordinates, radiusKm),
            }
          );
          setMechanics(getArray(mechanicsResult.data, "mechanics"));
        } catch (mechanicsRequestError) {
          setMechanics([]);
          setMechanicsError(
            getErrorMessage(
              mechanicsRequestError,
              "Could not load nearby mechanics."
            )
          );
        }
      }
    } else {
      setMechanics([]);
      setMechanicsError(
        locationResult.reason?.response?.status === 404
          ? "Select a location from your customer dashboard before searching."
          : getErrorMessage(
              locationResult.reason,
              "Could not load your selected location."
            )
      );
    }

    if (vehiclesResult.status === "fulfilled") {
      setVehicles(getArray(vehiclesResult.value.data, "vehicles"));
    } else {
      setVehicles([]);
      setPageError(
        getErrorMessage(
          vehiclesResult.reason,
          "Could not load your vehicles."
        )
      );
    }

    if (requestsResult.status === "fulfilled") {
      const data = requestsResult.value.data;
      setRequests(
        getArray(data, "requests", "assistanceRequests")
      );
    } else {
      setRequests([]);
      setPageError((current) =>
        current
          ? `${current} Could not load assistance requests.`
          : getErrorMessage(
              requestsResult.reason,
              "Could not load assistance requests."
            )
      );
    }

    setLoading(false);
    setMechanicsLoading(false);
  }, [radiusKm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRequest(mechanic) {
    const mechanicId = mechanic._id || mechanic.id;

    if (!mechanicId) {
      setPageError("This mechanic has an invalid ID. Please refresh.");
      return;
    }

    const vehicleId = selectedVehicles[mechanicId];
    const description = (descriptions[mechanicId] || "").trim();

    if (vehicles.length === 0) {
      setPageError("Please add a vehicle before requesting assistance.");
      return;
    }

    if (!vehicleId) {
      setPageError("Please select a vehicle before requesting assistance.");
      return;
    }

    if (!description) {
      setPageError("Please describe the vehicle problem.");
      return;
    }

    setPageError("");
    setSuccess("");
    setSubmittingId(mechanicId);

    try {
      await api.post("/customer/assistance-requests", {
        vehicleId,
        mechanicId,
        description,
        radiusKm: Number(radiusKm),
      });

      setSuccess("Your assistance request was submitted successfully.");

      setDescriptions((current) => ({
        ...current,
        [mechanicId]: "",
      }));

      await loadData();
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Could not submit your request.")
      );
    } finally {
      setSubmittingId("");
    }
  }

  async function handleCancel(requestId) {
    if (!requestId) {
      setPageError("This request has an invalid ID. Please refresh.");
      return;
    }

    setPageError("");
    setSuccess("");
    setCancellingId(requestId);

    try {
      await api.patch(
        `/customer/assistance-requests/${requestId}/cancel`
      );

      setSuccess("Your assistance request was cancelled.");
      await loadData();
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Could not cancel this request.")
      );
    } finally {
      setCancellingId("");
    }
  }

  function getMechanicName(mechanic) {
    return (
      mechanic.garageName ||
      mechanic.user?.name ||
      mechanic.name ||
      "Mechanic"
    );
  }

  function getStatusClass(status) {
    switch (String(status).toLowerCase()) {
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800";
      case "accepted":
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-amber-100 text-amber-800";
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Mecalink
            </h1>
            <p className="text-sm text-slate-500">
              Roadside Assistance
            </p>
          </div>

          <Link
            to="/customer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section>
          <h2 className="text-2xl font-bold text-slate-800">
            Find Nearby Mechanics
          </h2>
          <p className="mt-2 text-slate-600">
            Find approved mechanics around your saved breakdown location.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full max-w-xs">
              <label
                htmlFor="radius"
                className="block text-sm font-medium text-slate-700"
              >
                Search radius
              </label>

              <select
                id="radius"
                value={radiusKm}
                onChange={(event) => setRadiusKm(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="1">Within 1 km</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="20">Within 20 km</option>
                <option value="50">Within 50 km</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border border-blue-200 bg-white px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {pageError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {pageError}
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

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-800">
              Available Mechanics
            </h3>

            {!mechanicsLoading && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                {mechanics.length} found
              </span>
            )}
          </div>

          {mechanicsLoading ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-slate-600">
              Finding nearby mechanics...
            </p>
          ) : mechanicsError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">
                Unable to find nearby mechanics
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {mechanicsError}
              </p>

              {mechanicsError.toLowerCase().includes("breakdown address") ||
              mechanicsError.toLowerCase().includes("save your") ||
              mechanicsError.toLowerCase().includes("select a location") ? (
                <p className="mt-2 text-sm text-amber-800">
                  Open your customer dashboard, use your current location or
                  select an address suggestion, and save it before searching
                  again.
                </p>
              ) : null}

              <button
                type="button"
                onClick={loadData}
                className="mt-3 rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200"
              >
                Try Again
              </button>
            </div>
          ) : mechanics.length === 0 ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-slate-600">
              No approved mechanics were found within {radiusKm} km.
              Try a larger search radius or make sure mechanics have saved
              their garage locations and received admin approval.
            </p>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {mechanics.map((mechanic) => {
                const mechanicId = mechanic._id || mechanic.id;

                return (
                  <article
                    key={mechanicId}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm"
                  >
                    <h4 className="text-lg font-bold text-slate-800">
                      {getMechanicName(mechanic)}
                    </h4>

                    {mechanic.garageAddress && (
                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-medium">Address: </span>
                        {mechanic.garageAddress}
                      </p>
                    )}

                    {mechanic.description && (
                      <p className="mt-2 text-sm text-slate-600">
                        {mechanic.description}
                      </p>
                    )}

                    {Array.isArray(mechanic.services) &&
                      mechanic.services.length > 0 && (
                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-medium">Services: </span>
                          {mechanic.services.join(", ")}
                        </p>
                      )}

                    {mechanic.distanceKm != null && (
                      <p className="mt-2 text-sm font-semibold text-blue-700">
                        {Number(mechanic.distanceKm).toFixed(1)} km away
                      </p>
                    )}

                    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                      <div>
                        <label
                          htmlFor={`vehicle-${mechanicId}`}
                          className="block text-sm font-medium text-slate-700"
                        >
                          Select your vehicle
                        </label>

                        <select
                          id={`vehicle-${mechanicId}`}
                          value={selectedVehicles[mechanicId] || ""}
                          onChange={(event) =>
                            setSelectedVehicles((current) => ({
                              ...current,
                              [mechanicId]: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Choose a vehicle</option>

                          {vehicles.map((vehicle) => (
                            <option
                              key={vehicle._id || vehicle.id}
                              value={vehicle._id || vehicle.id}
                            >
                              {[
                                vehicle.make,
                                vehicle.model,
                                vehicle.registrationNumber,
                              ]
                                .filter(Boolean)
                                .join(" — ") || "Vehicle"}
                            </option>
                          ))}
                        </select>

                        {vehicles.length === 0 && !loading && (
                          <p className="mt-1 text-sm text-amber-700">
                            Add a vehicle from your customer dashboard
                            before requesting assistance.
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={`description-${mechanicId}`}
                          className="block text-sm font-medium text-slate-700"
                        >
                          Describe the problem
                        </label>

                        <textarea
                          id={`description-${mechanicId}`}
                          rows={3}
                          maxLength={1000}
                          value={descriptions[mechanicId] || ""}
                          onChange={(event) =>
                            setDescriptions((current) => ({
                              ...current,
                              [mechanicId]: event.target.value,
                            }))
                          }
                          placeholder="For example, the engine will not start."
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRequest(mechanic)}
                        disabled={
                          submittingId === mechanicId ||
                          vehicles.length === 0
                        }
                        className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submittingId === mechanicId
                          ? "Submitting..."
                          : "Request Assistance"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xl font-bold text-slate-800">
            My Assistance Requests
          </h3>

          {loading ? (
            <p className="mt-4 text-slate-500">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-slate-600">
              You have not made any assistance requests yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map((request) => {
                const requestId = request._id || request.id;
                const status = String(
                  request.status || "pending"
                ).toLowerCase();

                const mechanicName =
                  request.mechanic?.garageName ||
                  request.mechanic?.user?.name ||
                  request.mechanic?.name ||
                  "Selected mechanic";

                return (
                  <article
                    key={requestId}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-800">
                        {mechanicName}
                      </h4>

                      <p className="mt-1 break-words text-sm text-slate-600">
                        {request.description || "No problem description"}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(status)}`}
                      >
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(requestId)}
                        disabled={cancellingId === requestId}
                        className="shrink-0 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancellingId === requestId
                          ? "Cancelling..."
                          : "Cancel Request"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default NearbyMechanics;
