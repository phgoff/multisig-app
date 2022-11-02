import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const transactionRouter = router({
  create: publicProcedure
    .input(
      z.object({
        params: z.string(),
        account: z.string(),
        signature: z.string(),
        nonce: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.create({
        data: {
          params: input.params,
          nonce: input.nonce,
          confirmationsRequired: 2,
          confirmationsSubmitted: {
            create: [
              {
                account: input.account,
                signature: input.signature,
              },
            ],
          },
        },
      });
      return transaction;
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        account: z.string(),
        signature: z.string(),
        status: z.enum(["SUCCESS"]).nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.status === "SUCCESS") {
        const transaction = await ctx.prisma.transaction.update({
          where: {
            id: input.id,
          },
          data: {
            status: input.status,
          },
          include: {
            confirmationsSubmitted: true,
          },
        });
        return transaction;
      } else {
        const transaction = await ctx.prisma.transaction.update({
          where: {
            id: input.id,
          },
          data: {
            confirmationsSubmitted: {
              create: [
                {
                  account: input.account,
                  signature: input.signature,
                },
              ],
            },
          },
          include: {
            confirmationsSubmitted: true,
          },
        });
        const required = transaction.confirmationsRequired;
        const submitted = transaction.confirmationsSubmitted.length;
        if (required === submitted) {
          // update status to confirmed
          await ctx.prisma.transaction.update({
            where: {
              id: input.id,
            },
            data: {
              status: "CONFIRMED",
            },
          });
        }

        return transaction;
      }
    }),
  getByNonce: publicProcedure
    .input(
      z.object({
        nonce: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findFirst({
        where: {
          nonce: input.nonce,
        },
        include: {
          confirmationsSubmitted: true,
        },
      });

      return transaction;
    }),
  isApproved: publicProcedure
    .input(
      z.object({
        account: z.string(),
        nonce: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const transaction = await ctx.prisma.transaction.findFirst({
        where: {
          nonce: input.nonce,
          confirmationsSubmitted: {
            some: {
              account: input.account,
            },
          },
        },
      });

      return !!transaction;
    }),
});
