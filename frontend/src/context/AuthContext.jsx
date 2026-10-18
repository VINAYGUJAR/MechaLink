
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  // Verify the saved token with the backend when React starts.
  useEffect(() => {
    let active = true;

    async function verifySession() {
      const token = localStorage.getItem("token");

      if (!token) {
        if (active) setCheckingSession(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const authenticatedUser = response.data.user;

        if (!authenticatedUser?.role) {
          throw new Error("Invalid authentication response");
        }

        if (active) {
          setUser(authenticatedUser);
          localStorage.setItem(
            "user",
            JSON.stringify(authenticatedUser)
          );
        }
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        if (active) setUser(null);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    verifySession();

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { token, user: authenticatedUser } = response.data;

      if (!token || !authenticatedUser?.role) {
        throw new Error("Invalid login response from backend");
      }

      if (
        !["customer", "mechanic", "admin"].includes(
          authenticatedUser.role
        )
      ) {
        throw new Error("Invalid account role");
      }

      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify(authenticatedUser)
      );

      setUser(authenticatedUser);

      return authenticatedUser;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        checkingSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
