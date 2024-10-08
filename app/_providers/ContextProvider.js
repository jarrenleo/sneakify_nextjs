"use client";

import {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
} from "react";

const GlobalContext = createContext();

function getLocalStorage(key, defaultValue) {
  if (typeof window === "undefined") return;

  const storedValue = localStorage.getItem(key);
  return storedValue ? JSON.parse(storedValue) : defaultValue;
}

function setLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const initialState = {
  channel: getLocalStorage("channel", "SNKRS Web"),
  country: getLocalStorage("country", "SG"),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

function reducer(state, action) {
  switch (action.type) {
    case "setChannel":
      return { ...state, channel: action.payload };
    case "setCountry":
      return { ...state, country: action.payload };
    default:
      throw new Error("Invalid action type");
  }
}

export default function ContextProvider({ children }) {
  const [isClient, setIsClient] = useState(false);
  const [{ channel, country, timeZone }, dispatch] = useReducer(
    reducer,
    initialState,
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  function setChannel(channel) {
    dispatch({ type: "setChannel", payload: channel });
    setLocalStorage("channel", channel);
  }

  function setCountry(country) {
    dispatch({ type: "setCountry", payload: country });
    setLocalStorage("country", country);
  }

  return (
    <GlobalContext.Provider
      value={{
        channel,
        country,
        timeZone,
        setChannel,
        setCountry,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobalState() {
  return useContext(GlobalContext);
}
