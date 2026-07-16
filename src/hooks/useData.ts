import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CareSchedule, HealthRecord, HouseholdSettings, Kitten, PushDevice, WeighIn, WeighInInput } from "../lib/types";

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

export function useHealthRecords(catId?: string) {
  return useQuery({
    queryKey: ["health-records", catId ?? "all"],
    queryFn: () => api<HealthRecord[]>(catId ? `/api/health-records?cat_id=${catId}` : "/api/health-records"),
  });
}

export function useCreateHealthRecord() {
  const invalidate = useInvalidate("health-records");
  return useMutation({
    mutationFn: (body: Partial<HealthRecord>) =>
      api<HealthRecord>("/api/health-records", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useDeleteHealthRecord() {
  const invalidate = useInvalidate("health-records");
  return useMutation({
    mutationFn: (id: string) => api(`/api/health-records/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: () => api<CareSchedule[]>("/api/schedules"),
  });
}

export function useCreateSchedule() {
  const invalidate = useInvalidate("schedules");
  return useMutation({
    mutationFn: (body: Partial<CareSchedule>) =>
      api<CareSchedule>("/api/schedules", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateSchedule() {
  const invalidate = useInvalidate("schedules");
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CareSchedule> & { id: string }) =>
      api<CareSchedule>(`/api/schedules/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useDeleteSchedule() {
  const invalidate = useInvalidate("schedules");
  return useMutation({
    mutationFn: (id: string) => api(`/api/schedules/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useMarkScheduleDone() {
  const invalidate = useInvalidate("schedules", "health-records");
  return useMutation({
    mutationFn: (id: string) => api(`/api/schedules/${id}/done`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: invalidate,
  });
}

export function useCalendarUrl() {
  return useQuery({
    queryKey: ["calendar-url"],
    queryFn: () => api<{ url: string }>("/api/calendar/url"),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function usePushDevices() {
  return useQuery({
    queryKey: ["push-devices"],
    queryFn: () => api<PushDevice[]>("/api/push/subscriptions"),
  });
}

export function useSeedSample() {
  const invalidate = useInvalidate("kittens", "weigh-ins");
  return useMutation({
    mutationFn: () => api("/api/seed", { method: "POST" }),
    onSuccess: invalidate,
  });
}
