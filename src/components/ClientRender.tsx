import { createContext } from "react";
import { useIsMounted } from "../hooks";

export const ClientRender = createContext(null);

// resolved wagmi conflict with ssr
const ClientRenderProvider = ({ children }: { children: React.ReactNode }) => {
  const isMouted = useIsMounted();

  if (!isMouted) return null;
  return <ClientRender.Provider value={null}>{children}</ClientRender.Provider>;
};

export default ClientRenderProvider;
