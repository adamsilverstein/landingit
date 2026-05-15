import type { PRItem } from '../../../shared/types.js';

export type DashboardStackParamList = {
  PRList: undefined;
  PRDetail: { item: PRItem };
};

export type NotificationsStackParamList = {
  Notifications: undefined;
  NotificationRules: undefined;
};

export type RootTabParamList = {
  Dashboard: undefined;
  NotificationsTab: undefined;
  Settings: undefined;
};
