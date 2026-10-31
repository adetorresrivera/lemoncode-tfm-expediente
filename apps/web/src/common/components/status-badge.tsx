import type { ApplicationStatus } from "@tfm/contracts";
import {
  Ban,
  BadgeCheck,
  Bookmark,
  CircleX,
  MessagesSquare,
  Send,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { STATUS_LABELS } from "@/common/lib/enum-labels";

// Literal class strings: Tailwind cannot see classes built from template strings.
const STATUS_STYLES: Record<
  ApplicationStatus,
  { badge: string; dot: string; Icon: LucideIcon }
> = {
  guardada: {
    badge: "bg-status-saved-bg text-status-saved",
    dot: "bg-status-saved",
    Icon: Bookmark,
  },
  enviada: {
    badge: "bg-status-sent-bg text-status-sent",
    dot: "bg-status-sent",
    Icon: Send,
  },
  en_entrevistas: {
    badge: "bg-status-interview-bg text-status-interview",
    dot: "bg-status-interview",
    Icon: MessagesSquare,
  },
  oferta_recibida: {
    badge: "bg-status-offer-bg text-status-offer",
    dot: "bg-status-offer",
    Icon: BadgeCheck,
  },
  aceptada: {
    badge: "bg-status-offer-bg text-status-offer",
    dot: "bg-status-offer",
    Icon: Trophy,
  },
  rechazada: {
    badge: "bg-status-rejected-bg text-status-rejected",
    dot: "bg-status-rejected",
    Icon: CircleX,
  },
  descartada: {
    badge: "bg-status-rejected-bg text-status-rejected",
    dot: "bg-status-rejected",
    Icon: Ban,
  },
};

interface Props {
  status: ApplicationStatus;
}

export function StatusBadge({ status }: Props) {
  const { badge, dot, Icon } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-sm px-2 py-0.5 text-sm font-semibold ${badge}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
      {STATUS_LABELS[status]}
    </span>
  );
}
