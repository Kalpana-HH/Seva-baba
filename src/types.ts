export interface Event {
  id: string;
  title: string;
  type: string; // 'Brunch' | 'Baby Shower' | 'Dinner Party' | 'Picnic' | 'Book Club' | 'Tea Party' | 'Bridal Shower' | 'Other'
  date: string;
  time: string;
  guestsCount: number; // Will represent volunteer count for Temple events
  theme?: string; // Theme for Potluck, or Team Name for Temple
  description: string;
  createdAt: string;
  eventType?: 'potluck' | 'temple';
  creatorId?: string;
  creatorPhone?: string;
  invitedPhones?: string[]; // List of invited phone numbers (either guests or temple team members)
}

export interface User {
  id: string;
  name: string;
  email?: string;
  password: string; // Simple plain-text or hashed password stored securely
  phoneNumber?: string;
  role: 'member' | 'temple_team';
  autoSyncGoogleCalendar?: boolean; // User preference for Google Calendar auto-sync
}

export interface FoodItem {
  id: string;
  eventId: string;
  name: string;
  category: 'Appetizer' | 'Main' | 'Side' | 'Dessert' | 'Drink' | 'Other';
  quantity: number;
  unit: string;
  assignedTo: string; // 'Host' or a guest's name (for potlucks)
  notes?: string;
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  timelineStage: '1 week before' | '3 days before' | '1 day before' | 'Morning of' | 'During event';
  completed: boolean;
}

export function isEventHost(event?: Event | null, user?: User | null): boolean {
  if (!event || !user) return false;

  if (event.creatorId || event.creatorPhone) {
    const matchesId = event.creatorId === user.id || (!!user.email && event.creatorId === user.email);
    const matchesPhone = Boolean(
      event.creatorPhone && (
        event.creatorPhone === user.phoneNumber ||
        (!!user.email && event.creatorPhone === user.email) ||
        event.creatorPhone === user.id
      )
    );
    return matchesId || matchesPhone;
  }

  // Preseeded default events without creator info can be edited by the user
  return true;
}

