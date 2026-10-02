import { useWalletContext } from "@/context/WalletContext";
import { shortenAddress } from "@/utils/formatAddress";

export function useWallet() {
  const ctx = useWalletContext();
  return {
    ...ctx,
    shortAddress: ctx.account ? shortenAddress(ctx.account) : null,
  };
}
