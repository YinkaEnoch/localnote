import { createContext, useContext } from 'react';

/** Opens the navigation drawer. Provided by AppLayout. */
export const DrawerContext = createContext<() => void>(() => {});

export const useDrawer = () => useContext(DrawerContext);