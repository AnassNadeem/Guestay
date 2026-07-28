import type { BaseRecord, DataProvider } from "@refinedev/core";
import { mockStore } from "../mock/store";

export const dataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
  }: {
    resource: string;
  }) => {
    const data = mockStore.list(resource) as TData[];
    return { data, total: data.length };
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: {
    resource: string;
    id: string | number;
  }) => {
    const data = mockStore.get(resource, String(id)) as TData | undefined;
    if (!data) throw new Error("Not found");
    return { data };
  },
  create: async <TData extends BaseRecord = BaseRecord>({
    resource,
    variables,
  }: {
    resource: string;
    variables: object;
  }) => {
    const data = mockStore.create(
      resource,
      variables as Record<string, unknown>,
    ) as TData;
    return { data };
  },
  update: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
    variables,
  }: {
    resource: string;
    id: string | number;
    variables: object;
  }) => {
    const data = mockStore.update(
      resource,
      String(id),
      variables as Record<string, unknown>,
    ) as TData;
    return { data };
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: {
    resource: string;
    id: string | number;
  }) => {
    const data = mockStore.remove(resource, String(id)) as TData;
    return { data };
  },
  getApiUrl: () => import.meta.env.VITE_SITE_URL || "http://localhost:3000",
} as DataProvider;
