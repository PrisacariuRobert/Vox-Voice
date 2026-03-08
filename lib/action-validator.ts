/**
 * Action Validator — Checks required fields before executing an action.
 *
 * If required fields are missing, returns ClarificationField[] describing
 * what the user needs to provide. The ClarificationDialog component then
 * prompts the user before re-attempting execution.
 *
 * Required fields by action:
 *   send_email:     to, subject, body
 *   create_event:   title, startTime
 *   create_meeting: meetingSubject, meetingStartTime
 *   delete_event:   searchTitle
 *   update_event:   searchTitle
 *   set_alarm:      alarmTime (HH:MM 24h format)
 *   cancel_alarm:   (none — always valid)
 *
 * @module action-validator
 */
import { ActionPayload, ActionType, ClarificationField } from '../types';

const REQUIRED_FIELDS: Record<ActionType, { key: keyof ActionPayload; label: string; placeholder: string }[]> = {
  send_email: [
    { key: 'to', label: 'To', placeholder: 'recipient@email.com' },
    { key: 'subject', label: 'Subject', placeholder: 'Email subject' },
    { key: 'body', label: 'Message', placeholder: 'Email body text' },
  ],
  create_event: [
    { key: 'title', label: 'Event Title', placeholder: 'Meeting name' },
    { key: 'startTime', label: 'Start Time', placeholder: '2024-03-08T11:30:00' },
  ],
  create_meeting: [
    { key: 'meetingSubject', label: 'Meeting Subject', placeholder: 'Meeting topic' },
    { key: 'meetingStartTime', label: 'Start Time', placeholder: '2024-03-08T14:00:00' },
  ],
  delete_event: [
    { key: 'searchTitle', label: 'Event to delete', placeholder: 'Event title to search for' },
  ],
  update_event: [
    { key: 'searchTitle', label: 'Event to update', placeholder: 'Event title to search for' },
  ],
  set_alarm: [
    { key: 'alarmTime', label: 'Alarm Time', placeholder: '07:00 (24h format)' },
  ],
  cancel_alarm: [],
};

/**
 * Returns list of missing required fields for a given action.
 * Empty array = all required fields present, ready to execute.
 */
export function getMissingFields(action: ActionPayload): ClarificationField[] {
  const fields = REQUIRED_FIELDS[action.actionType];
  if (!fields) return [];

  return fields
    .filter((f) => {
      const val = action[f.key];
      return !val || (typeof val === 'string' && !val.trim());
    })
    .map((f) => ({
      key: f.key,
      label: f.label,
      placeholder: f.placeholder,
      required: true,
      value: (action[f.key] as string) ?? '',
    }));
}
