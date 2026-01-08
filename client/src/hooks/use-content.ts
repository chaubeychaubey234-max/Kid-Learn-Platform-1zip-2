import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useContent(type?: string) {
  return useQuery({
    queryKey: [api.content.list.path, type],
    queryFn: async () => {
      const url = new URL(api.content.list.path, window.location.origin);
      if (type) {
        url.searchParams.append("type", type);
      }
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch content");
      return api.content.list.responses[200].parse(await res.json());
    },
  });
}
