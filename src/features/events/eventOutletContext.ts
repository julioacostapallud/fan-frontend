import type { EventDetail } from '../../api/types';

export type EventOutletContext = {
  eventId: string;
  event: EventDetail | null;
};
