import { Attendee, EventMetadata } from '../types';

console.log('supabase.ts: Modos MOCK ativo (Desconectado)');

// Mock attendees functions
export async function fetchAttendees(): Promise<Attendee[]> {
    console.log('Mock: fetching attendees');
    return [];
}

export async function addAttendee(attendee: Attendee): Promise<boolean> {
    console.log('Mock: adding attendee', attendee);
    return true;
}

export async function updateAttendee(attendee: Attendee): Promise<boolean> {
    console.log('Mock: updating attendee', attendee);
    return true;
}

export async function deleteAttendee(id: string): Promise<boolean> {
    console.log('Mock: deleting attendee', id);
    return true;
}

export async function clearAllAttendees(): Promise<boolean> {
    console.log('Mock: clearing all attendees');
    return true;
}

// Event Metadata functions
export async function fetchEventMetadata(): Promise<EventMetadata | null> {
    console.log('Mock: fetching event metadata');
    return null;
}

export async function saveEventMetadata(metadata: EventMetadata): Promise<boolean> {
    console.log('Mock: saving event metadata', metadata);
    return true;
}

export async function clearEventMetadata(): Promise<boolean> {
    console.log('Mock: clearing event metadata');
    return true;
}

// Export a dummy supabase object for compatibility if needed
export const supabase = {
    from: () => ({
        select: () => ({ order: () => ({ limit: () => ({ single: () => ({ data: null, error: null }) }) }) }),
        insert: () => ({ error: null }),
        update: () => ({ eq: () => ({ error: null }) }),
        delete: () => ({ eq: () => ({ error: null }), neq: () => ({ error: null }) }),
    })
};
