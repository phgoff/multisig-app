import { useAccount, useBalance } from "wagmi";

export function Account() {
  const { address } = useAccount();
  const { data } = useBalance({
    addressOrName: address,
  });

  return <div>Account: {address}</div>;
}
