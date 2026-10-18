
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState({});
  const [mechanics, setMechanics] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRole, setUserRole] = useState("customer");
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statsResult, mechanicsResult] = await Promise.all([
        api.get("/admin/dashboard/stats"),
        api.get("/admin/mechanics", {
          params: { status: "pending", page: 1, limit: 10 },
        }),
      ]);

      setStats(statsResult.data.stats || statsResult.data);

      const data = mechanicsResult.data;
      setMechanics(
        Array.isArray(data)
          ? data
          : data.mechanics || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (role) => {
    setUsersLoading(true);
    setError("");

    try {
      const response = await api.get("/admin/users", {
        params: { role, page: 1, limit: 10 },
      });

      const data = response.data;
      setUsers(
        Array.isArray(data)
          ? data
          : data.users || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load users."
      );
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadUsers(userRole);
  }, [userRole, loadUsers]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleVerification(mechanicId, status) {
    setBusyId(mechanicId);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/admin/mechanics/${mechanicId}/verification`,
        { status }
      );

      setSuccess(
        status === "approved"
          ? "Mechanic approved successfully."
          : "Mechanic rejected successfully."
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update mechanic verification."
      );
    } finally {
      setBusyId("");
    }
  }

  function getMechanicId(mechanic) {
    return mechanic._id || mechanic.id;
  }

  function getUserDetails(item) {
    // Some APIs return a mechanic profile containing a nested user.
    const account = item.user || item;

    return {
      name: account.name || item.garageName || "Name unavailable",
      email: account.email || "Email unavailable",
      phone: account.phone || "Phone unavailable",
      role: account.role || "mechanic",
    };
  }

  function getCount(...keys) {
    for (const key of keys) {
      const value = stats[key];

      if (typeof value === "number") {
        return value;
      }
    }

    return "—";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Mecalink
            </h1>
            <p className="text-sm text-slate-500">
              Admin Dashboard
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-2xl bg-blue-700 p-6 text-white">
          <p className="text-sm text-blue-100">
            Administration
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            Welcome, {user?.name || "Admin"}
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Manage users and verify mechanics on Mecalink.
          </p>

          <button
            onClick={loadDashboard}
            className="mt-5 rounded-lg bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
          >
            Refresh Dashboard
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
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

        <section>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Platform Overview
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={getCount("totalUsers", "userCount")}
            />
            <StatCard
              title="Customers"
              value={getCount("totalCustomers", "customerCount")}
            />
            <StatCard
              title="Mechanics"
              value={getCount("totalMechanics", "mechanicCount")}
            />
            <StatCard
              title="Pending Verification"
              value={
                getCount(
                  "pendingMechanics",
                  "pendingVerifications",
                  "pendingCount"
                ) !== "—"
                  ? getCount(
                      "pendingMechanics",
                      "pendingVerifications",
                      "pendingCount"
                    )
                  : mechanics.length
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              Mechanic Verification
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Review pending mechanic registrations before approving them.
            </p>
          </div>

          {mechanics.length === 0 ? (
            <p className="mt-5 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
              No pending mechanics found.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {mechanics.map((mechanic) => {
                const id = getMechanicId(mechanic);
                const details = getUserDetails(mechanic);

                return (
                  <article
                    key={id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800">
                          {mechanic.garageName || details.name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Account: {details.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Email: {details.email}
                        </p>
                        <p className="text-sm text-slate-500">
                          Phone: {details.phone}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Address: {mechanic.garageAddress || "Not provided"}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className="font-medium">Verification:</span>{" "}
                          {mechanic.verificationStatus || "pending"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleVerification(id, "approved")
                          }
                          disabled={busyId === id}
                          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            handleVerification(id, "rejected")
                          }
                          disabled={busyId === id}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              User Management
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              View registered customer and mechanic accounts.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setUserRole("customer")}
              className={`rounded-lg px-4 py-2 font-semibold ${
                userRole === "customer"
                  ? "bg-blue-700 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Customers
            </button>

            <button
              onClick={() => setUserRole("mechanic")}
              className={`rounded-lg px-4 py-2 font-semibold ${
                userRole === "mechanic"
                  ? "bg-blue-700 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Mechanics
            </button>
          </div>

          {usersLoading ? (
            <p className="py-8 text-center text-slate-500">
              Loading users...
            </p>
          ) : users.length === 0 ? (
            <p className="mt-5 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
              No {userRole} accounts found.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Name / Garage</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => {
                    const id = item._id || item.id;
                    const details = getUserDetails(item);

                    return (
                      <tr key={id} className="border-t">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {details.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {details.email}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {details.phone}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600">
                          {details.role}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default AdminDashboard;
