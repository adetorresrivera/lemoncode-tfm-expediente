import type { Application } from "@tfm/contracts";
import type { ApplicationListItem } from "./application-list.vm";

export const mapApplicationFromApiToVm = (
  application: Application,
): ApplicationListItem => ({
  id: application.id,
  title: application.title,
  company: application.company,
  status: application.status,
});

export const mapApplicationListFromApiToVm = (
  applications: Application[],
): ApplicationListItem[] => applications.map(mapApplicationFromApiToVm);
