import { router } from "../trpc";
import { transactionRouter } from "./transaction";

export const appRouter = router({
  transaction: transactionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
