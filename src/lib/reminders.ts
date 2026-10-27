import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { dayKey } from './dates';
import { useStore } from './store';
import { streakInfo } from './streak';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const MEAL_TIMES = [
  { hour: 8, minute: 30, title: 'Breakfast time', body: 'Snap your breakfast to keep your log up to date.' },
  { hour: 12, minute: 30, title: 'Lunch time', body: "Snap your lunch so you know what's left for today." },
  { hour: 18, minute: 30, title: 'Dinner time', body: 'Log dinner to finish your day on track.' },
];

export async function askPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Rebuilds every scheduled reminder from the saved settings. Call after settings change and after logging a meal. */
export async function syncReminders() {
  const { reminders, days } = useStore.getState();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!reminders.meals && !reminders.streak && !reminders.weighIn) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const channelId = 'reminders';

  if (reminders.meals) {
    for (const m of MEAL_TIMES) {
      await Notifications.scheduleNotificationAsync({
        content: { title: m.title, body: m.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: m.hour, minute: m.minute, channelId },
      });
    }
  }

  if (reminders.weighIn) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Weekly weigh-in', body: 'Step on the scale and log your weight to see your progress.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 8, minute: 0, channelId },
    });
  }

  if (reminders.streak) {
    // One-off reminders at 8pm for the next week, skipping today if a meal is already logged.
    const { current } = streakInfo(days);
    const loggedToday = (days[dayKey()]?.length ?? 0) > 0;
    for (let i = loggedToday ? 1 : 0; i < 7; i++) {
      const at = new Date();
      at.setDate(at.getDate() + i);
      at.setHours(20, 0, 0, 0);
      if (at.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: current > 0 ? `Keep your ${current + i} day streak` : 'Start a streak today',
          body: "You haven't logged a meal yet today. It only takes a few seconds.",
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId },
      });
    }
  }
}
