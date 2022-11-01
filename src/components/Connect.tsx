import { useAccount, useConnect, useDisconnect } from "wagmi";

import { useIsMounted } from "../hooks";
import { Account } from "./Account";

export function Connect() {
  const isMounted = useIsMounted();
  const { connector, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const { disconnect } = useDisconnect();

  if (!isMounted || isLoading) {
    return <p>loading...</p>;
  }

  return (
    <div>
      <div>
        {isConnected ? (
          <div className="flex flex-col items-center gap-3">
            <Account />
            <button
              className="rounded-md border border-red-500 p-2 text-red-500"
              onClick={() => disconnect()}
            >
              Disconnect from {connector?.name}
            </button>
          </div>
        ) : (
          <div className="flex gap-10">
            {connectors
              .filter((x) => isMounted && x.ready && x.id !== connector?.id)
              .map((x) => (
                <button
                  key={x.id}
                  className="rounded-md border border-black p-2"
                  onClick={() => connect({ connector: x })}
                >
                  {x.name}
                  {isLoading &&
                    x.id === pendingConnector?.id &&
                    " (connecting)"}
                </button>
              ))}
          </div>
        )}
      </div>

      {error && <div className="text-red-500">{error.message}</div>}
    </div>
  );
}
