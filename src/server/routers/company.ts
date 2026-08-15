import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getOrgMembership, assertMinRole } from "../trpc";

export const companyRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await getOrgMembership(
        ctx.supabase,
        input.organizationId,
        ctx.user.id,
      );
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      const { data } = await ctx.supabase
        .from("companies")
        .select("*, interviews(id)")
        .eq("organizationId", input.organizationId)
        .order("name", { ascending: true });

      return (data ?? []).map((c) => ({
        ...c,
        _count: { interviews: (c.interviews as { id: string }[])?.length ?? 0 },
        interviews: undefined,
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: company } = await ctx.supabase
        .from("companies")
        .select("*, interviews(id, title, isActive, createdAt)")
        .eq("id", input.id)
        .single();

      if (!company) throw new TRPCError({ code: "NOT_FOUND" });

      const membership = await getOrgMembership(
        ctx.supabase,
        company.organizationId,
        ctx.user.id,
      );
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      return company;
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(200),
        website: z.string().url().optional().or(z.literal("")),
        industry: z.string().optional(),
        size: z.string().optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await getOrgMembership(
        ctx.supabase,
        input.organizationId,
        ctx.user.id,
      );
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      const { data, error } = await ctx.supabase
        .from("companies")
        .insert({
          organizationId: input.organizationId,
          name: input.name,
          website: input.website || null,
          industry: input.industry || null,
          size: input.size || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        website: z.string().url().optional().or(z.literal("")).optional(),
        industry: z.string().optional(),
        size: z.string().optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: company } = await ctx.supabase
        .from("companies")
        .select("organizationId")
        .eq("id", input.id)
        .single();

      if (!company) throw new TRPCError({ code: "NOT_FOUND" });

      const membership = await getOrgMembership(
        ctx.supabase,
        company.organizationId,
        ctx.user.id,
      );
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      const { id, ...data } = input;
      const { data: updated, error } = await ctx.supabase
        .from("companies")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: company } = await ctx.supabase
        .from("companies")
        .select("organizationId")
        .eq("id", input.id)
        .single();

      if (!company) throw new TRPCError({ code: "NOT_FOUND" });

      const membership = await getOrgMembership(
        ctx.supabase,
        company.organizationId,
        ctx.user.id,
      );
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      assertMinRole(membership.role, "ADMIN");

      await ctx.supabase.from("companies").delete().eq("id", input.id);
      return { success: true };
    }),
});
