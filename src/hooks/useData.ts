import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { HouseholdSettings, Kitten, WeighIn, WeighInInput } from "../lib/types";

// Postgres returns numeric columns as strings — coerce once, here.
function coerceWeighIn(w: WeighIn): WeighIn {
  return { ...w, weight_grams: Number(w.weight_grams) };
}

export function useKittens() {
  return useQuery({
    queryKey: ["kittens"],
    queryFn: () => api<Kitten[]>("/api/kittens"),
  });
}

export function useWeighIns(kittenId?: string) {
  return useQuery({
    queryKey: ["weigh-ins", kittenId ?? "all"],
    queryFn: async () => {
      const path = kittenId ? `/api/weigh-ins?kitten_id=${kittenId}` : "/api/weigh-ins";
      return (await api<WeighIn[]>(path)).map(coerceWeighIn);
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api<HouseholdSettings>("/api/settings"),
  });
}

function useInvalidate(...keys: string[]) {
  const qc = useQueryClient();
  return () => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useCreateKitten() {
  const invalidate = useInvalidate("kittens");
  return useMutation({
    mutationFn: (body: Partial<Kitten>) => api<Kitten>("/api/kittens", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateKitten() {
  const invalidate = useInvalidate("kittens");
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Kitten> & { id: string }) =>
      api<Kitten>(`/api/kittens/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useDeleteKitten() {
  const invalidate = useInvalidate("kittens", "weigh-ins");
  return useMutation({
    mutationFn: (id: string) => api(`/api/kittens/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreateWeighIns() {
  const invalidate = useInvalidate("weigh-ins");
  return useMutation({
    mutationFn: (entries: WeighInInput[]) =>
      api<WeighIn[]>("/api/weigh-ins", { method: "POST", body: JSON.stringify({ entries }) }),
    onSuccess: invalidate,
  });
}

export function useUpdateWeighIn() {
  const invalidate = useInvalidate("weigh-ins");
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<WeighIn> & { id: string }) =>
      api<WeighIn>(`/api/weigh-ins/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useDeleteWeighIn() {
  const invalidate = useInvalidate("weigh-ins");
  return useMutation({
    mutationFn: (id: string) => api(`/api/weigh-ins/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useSaveSettings() {
  const invalidate = useInvalidate("settings");
  return useMutation({
    mutationFn: (body: HouseholdSettings) => api<HouseholdSettings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useSeedSample() {
  const invalidate = useInvalidate("kittens", "weigh-ins");
  return useMutation({
    mutationFn: () => api("/api/seed", { method: "POST" }),
    onSuccess: invalidate,
  });
}
