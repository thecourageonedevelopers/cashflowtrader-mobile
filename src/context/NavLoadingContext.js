import React, { createContext, useCallback, useContext, useState } from "react";

const NavLoadingContext = createContext({ loading: false, show: () => {}, hide: () => {} });

export function NavLoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const show = useCallback(() => setLoading(true), []);
  const hide = useCallback(() => setLoading(false), []);
  return (
    <NavLoadingContext.Provider value={{ loading, show, hide }}>
      {children}
    </NavLoadingContext.Provider>
  );
}

export function useNavLoading() {
  return useContext(NavLoadingContext);
}
