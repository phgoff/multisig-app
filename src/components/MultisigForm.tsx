import { BigNumber, utils } from "ethers";
import { formatEther, getAddress, parseEther } from "ethers/lib/utils";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useSignTypedData,
  useWaitForTransaction,
} from "wagmi";
import { abi } from "../contract/abi";
import { trpc } from "../utils/trpc";

const CONTRACT_ADDR = "0x17C47F4E087B6c8f5DE0EAcf87fFD5fEe45a90e6";
const KTOKEN = "0x4a4a7CdF79bF88d20618f23647CC3fD4A0bea2f7";

const domain = {
  name: "Multisig",
  version: "1.0.0",
  chainId: 25925,
  verifyingContract: CONTRACT_ADDR,
} as const;

const types = {
  TransactionRequest: [
    {
      name: "to",
      type: "address",
    },
    {
      name: "value",
      type: "uint256",
    },
    {
      name: "data",
      type: "bytes",
    },
    {
      name: "nonce",
      type: "uint256",
    },
  ],
} as const;

const iface = new utils.Interface(abi);

export default function MultisigForm() {
  // TODO: Check current account is multisig owner
  const { address } = useAccount();
  const nonce = useContractRead({
    address: CONTRACT_ADDR,
    abi,
    functionName: "nonce",
  });

  const createMutation = trpc.transaction.create.useMutation();
  const updateMutation = trpc.transaction.update.useMutation();
  const currentTransaction = trpc.transaction.getByNonce.useQuery(
    {
      nonce: nonce.data?.toNumber()!,
    },
    {
      enabled: !!nonce.data,
    }
  );

  const isApproved = trpc.transaction.isApproved.useQuery(
    {
      account: address!,
      nonce: nonce.data?.toNumber()!,
    },
    {
      enabled: !!nonce.data,
    }
  );

  const { signTypedDataAsync } = useSignTypedData();

  // utils
  const parsedParams = (data: string | undefined) => {
    if (!data) return;
    const parsed = JSON.parse(data) as {
      to: `0x${string}`;
      value: BigNumber;
      data: `0x${string}`;
    };
    return parsed;
  };

  const decodeBytesData = (data: ReturnType<typeof parsedParams>) => {
    if (!data) return;
    const decoded = iface.decodeFunctionData("withdrawKToken", data.data) as [
      `0x${string}`,
      `0x${string}`,
      BigNumber
    ];
    const [token, to, amount] = decoded;
    return { token, to, amount };
  };
  const params = parsedParams(currentTransaction.data?.params);
  const decodedData = decodeBytesData(params);

  const signatures = currentTransaction.data?.confirmationsSubmitted.map(
    (c) => c.signature
  ) as `0x${string}`[];

  const { config } = usePrepareContractWrite({
    address: CONTRACT_ADDR,
    abi,
    functionName: "executeTransaction",
    args: [signatures, params?.to!, params?.value!, params?.data!],
    enabled:
      currentTransaction.data?.status === "CONFIRMED" &&
      signatures?.length === 2, // FIXME: Hardcoded required signatures
  });
  const {
    data: executeHash,
    writeAsync: executeAsync,
    error,
    isError,
  } = useContractWrite(config);

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: executeHash?.hash,
  });

  // handlers
  const handleSumbit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      const target = e.target as typeof e.target & {
        amount: { value: number };
        to: { value: string };
      };
      const { to, amount } = target;
      console.log("amount", amount.value, to.value);

      const amountVal = amount.value
        ? parseEther(amount.value.toString())
        : BigNumber.from(0);
      const toVal = to.value
        ? getAddress(to.value)
        : "0x8c3040a773D6900ca6C8eD787cb4348f195f8e3f";

      const bytes = iface.encodeFunctionData("withdrawKToken", [
        KTOKEN,
        toVal,
        amountVal,
      ]);

      const value = {
        to: CONTRACT_ADDR,
        value: BigNumber.from(0),
        data: bytes as `0x${string}`,
        nonce: nonce.data!,
      } as const;

      const sig = await signTypedDataAsync({ domain, types, value });

      // create transaction in db
      await createMutation.mutateAsync({
        params: JSON.stringify({
          to: CONTRACT_ADDR,
          value: 0,
          data: bytes,
        }),
        account: address!,
        signature: sig,
        nonce: nonce.data!?.toNumber(),
      });
    } catch (error) {}
  };

  const handleApprove = async () => {
    try {
      const parsed = JSON.parse(currentTransaction.data?.params!) as {
        to: string;
        value: string;
        data: string;
      };

      const value = {
        to: parsed.to as `0x${string}`,
        value: parsed.value as unknown as BigNumber,
        data: parsed.data as `0x${string}`,
        nonce: nonce.data!,
      } as const;

      const sig = await signTypedDataAsync({ domain, types, value });

      // update to db
      await updateMutation.mutateAsync({
        id: currentTransaction.data?.id!,
        account: address!,
        signature: sig,
      });
    } catch (error) {}
  };

  const handleExecute = async () => {
    try {
      await executeAsync?.();
      await updateMutation.mutateAsync({
        id: currentTransaction.data?.id!,
        status: "SUCCESS",
        account: "0x", // Not used
        signature: "0x", // Not used
      });
    } catch (error) {
      console.log("error", error);
    }
  };

  // components
  const TransactionDetail = () => {
    return (
      <>
        <h1>
          Transaction #{nonce.data?.toNumber()}{" "}
          {currentTransaction.data?.status}
        </h1>
        <h1>
          Approval {currentTransaction.data?.confirmationsSubmitted.length} /{" "}
          {currentTransaction.data?.confirmationsRequired}
        </h1>
        <div>
          <h2>Information:</h2>
          <p>Token: {decodedData?.token}</p>
          <p>To: {decodedData?.to}</p>
          <p>Amount: {formatEther(decodedData?.amount!)}</p>
        </div>
      </>
    );
  };

  const CreateTransaction = () => {
    return (
      <>
        <h1>Withdraw Token 2 of 2</h1>
        <div className="mt-5">
          {nonce.data ? <p>Transaction #{nonce.data?.toNumber()}</p> : null}
          {isApproved.data ? (
            <p>Approved?: {isApproved.data?.toString()}</p>
          ) : null}
        </div>
        <form className="mt-5 flex flex-col gap-y-5" onSubmit={handleSumbit}>
          <h1>Create Transaction</h1>
          <div>
            <label htmlFor="to" className="text-sm font-medium">
              To
            </label>
            <input
              id="to"
              type="string"
              className="mt-1 w-full rounded-lg border border-gray-200 p-4 pr-12 text-sm shadow-sm"
              placeholder="to"
            />
          </div>
          <div>
            <label htmlFor="amount" className="text-sm font-medium">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              step="any"
              className="mt-1 w-full rounded-lg border border-gray-200 p-4 pr-12 text-sm shadow-sm"
              placeholder="amount"
            />
          </div>
          <button
            type="submit"
            className="block w-full rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-white"
          >
            Approve
          </button>
        </form>
      </>
    );
  };

  const ApproveTransaction = () => {
    return (
      <div className="flex flex-col gap-y-5">
        <TransactionDetail />
        <button
          className="block w-full rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-white disabled:bg-slate-300"
          onClick={handleApprove}
          disabled={isApproved.data}
        >
          Approve
        </button>
      </div>
    );
  };

  const ExecuteTransaction = () => {
    return (
      <div className="flex flex-col gap-y-5">
        <TransactionDetail />
        <button
          className="block w-full rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-white"
          onClick={handleExecute}
        >
          Execute
        </button>
        {isError && <p className="max-w-md overflow-auto">{error?.message}</p>}
      </div>
    );
  };

  const SuccessTransaction = () => {
    return (
      <div className="flex flex-col gap-y-5">
        <TransactionDetail />
        {isLoading ? (
          <button className="block w-full rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-white">
            Executing...
          </button>
        ) : (
          isSuccess && (
            <>
              <button className="block w-full rounded-lg bg-green-500 px-5 py-3 text-sm font-medium text-white">
                Success
              </button>
              <button
                className="block w-full rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-white"
                onClick={() => nonce.refetch()}
              >
                Create new transaction
              </button>
            </>
          )
        )}
      </div>
    );
  };

  return (
    <div className="mt-5">
      {currentTransaction.isLoading ? (
        <p>Loading...</p>
      ) : !currentTransaction.data ? (
        <CreateTransaction />
      ) : currentTransaction.data?.status === "PENDING" ? (
        <ApproveTransaction />
      ) : currentTransaction.data &&
        currentTransaction.data?.status === "CONFIRMED" ? (
        <ExecuteTransaction />
      ) : currentTransaction.data &&
        currentTransaction.data?.status === "SUCCESS" ? (
        <SuccessTransaction />
      ) : null}
    </div>
  );
}
