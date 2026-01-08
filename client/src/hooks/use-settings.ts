import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertSettingsSchema } from "@shared/schema";

export function useSettings(kidId: number) {
  return useQuery({
    queryKey: [api.settings.get.path, kidId],
    enabled: !!kidId,
    queryFn: async () => {
      const url = buildUrl(api.settings.get.path, { kidId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch settings");
      return api.settings.get.responses[200].parse(await res.json());
    },
  });
}

type UpdateSettingsInput = z.infer<typeof api.settings.update.input>;

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kidId, updates }: { kidId: number; updates: UpdateSettingsInput }) => {
      const url = buildUrl(api.settings.update.path, { kidId });
      const validated = api.settings.update.input.parse(updates);
      
      const res = await fetch(url, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update settings");
      return api.settings.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.settings.get.path, variables.kidId] });
    },
  });
}
